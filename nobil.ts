import {
	connectWebSocket,
	isWebSocketCloseEvent,
	isWebSocketPingEvent,
	isWebSocketPongEvent,
	WebSocket,
} from "https://deno.land/std/ws/mod.ts";
import { blue, red, yellow } from "https://deno.land/std/fmt/colors.ts";
import { writeJson } from "https://deno.land/std/fs/mod.ts";
import { Application, Router, Context, send } from 'https://deno.land/x/oak/mod.ts'
import { oakCors } from "https://deno.land/x/cors/mod.ts";

//
// Data
//
const API_KEY = "!!"
const DATADUMP_URL = `https://nobil.no/api/server/datadump.php?countrycode=NOR&format=json&apikey=${API_KEY}`
const WS_URL = `ws://realtime.nobil.no/api/v1/stream?apikey=${API_KEY}`

const TYPE_SNAPSHOT_INIT = "snapshot:init"
const TYPE_STATUS_UPDATE = "status:update"

const TEN_SECONDS = 1000 * 10
const A_MINUTE = 1000 * 60
const AN_HOUR = 1000 * 60 * 60

const STATUS_AVAILABLE = 0
const STATUS_UNKNOWN = -1
const STATUS_OCCUPIED = 1
const STATUS_ERROR = 2

const SERVER_PORT = 8081;
const API_DIR = `./api`

type Connector = {
	uuid: string;
	status: number;
	error: number;
	timestamp: number;
}

type StationStatus = {
	uuid: string;
	status: number;
	connectors: Connector[];
}
type SnapshotInit = { type: "snapshot:init", data: StationStatus[] }
type StatusUpdate = { type: "status:update", data: StationStatus }

const statuses: StationStatus[] = [];

let sock: WebSocket;
try {
	sock = await connectWebSocket(WS_URL);
} catch (err) {
	console.error(red(`Could not connect to WebSocket: '${err}'`));
	Deno.exit(0);
}

try {
	await Promise.race([
		readMessages(sock), 
		ping(sock), 
		writeStatusesToFile(statuses),
		// writeStationsToFile(),
		staticServer(),
	]).catch(console.error);
} catch (err) {
	console.error("Something went wrong: ", err)
}
if (!sock.isClosed) {
	await sock.close(1000).catch(console.error);
}
Deno.exit(0);

async function readMessages(sock: WebSocket) {
	for await (const msg of sock) {
		if (typeof msg === "string") {
			const obj = JSON.parse(msg);

			if (obj.type === TYPE_SNAPSHOT_INIT) {
				const snapshhot = obj as SnapshotInit
				snapshhot.data.forEach((status) => statuses.push(status))
				console.log(yellow(printStatuses(statuses)));
			} else if (obj.type === TYPE_STATUS_UPDATE) {
				const statusUpdate = obj as StatusUpdate
				const index = statuses.findIndex((status) => statusUpdate.data.uuid === status.uuid);
				statuses[index] = statusUpdate.data
				console.log(yellow(printStatuses(statuses)));
			}
		} else if (isWebSocketPingEvent(msg)) {
			console.log(blue("< ping"));
		} else if (isWebSocketPongEvent(msg)) {
			console.log(blue("< pong"));
		} else if (isWebSocketCloseEvent(msg)) {
			console.log(red(`closed: code=${msg.code}, reason=${msg.reason}`));
			Deno.exit(0);
		}
	}
}

async function staticServer() {
	const app = new Application();
	app.use(oakCors({
		origin: "http://localhost:3000"
	}));
	app.use(async (ctx: Context, next: Function) => {
		await send(ctx, ctx.request.url.pathname, {
			root: API_DIR
		});
	});

	await app.listen({port: SERVER_PORT})
}

async function ping(sock: WebSocket) {
	do {
		console.log(red("> ping"));
		await sock.ping();
		await new Promise(resolve => setTimeout(resolve, TEN_SECONDS));
	} while (true);
}

async function writeStatusesToFile(statuses: StationStatus[]) {
	await new Promise(resolve => setTimeout(resolve, TEN_SECONDS));

	do {
		console.log(red("> writing latest statuses.json to file every minute"));
		writeJson(`${API_DIR}/statuses.json`, statuses)
		await new Promise(resolve => setTimeout(resolve, A_MINUTE));
	} while (true);
}

async function writeStationsToFile() {
	do {
		let res = await fetch(DATADUMP_URL)
		res = await res.json();
		console.log(red("> writing latest stations.json to file every hour"));
		writeJson(`${API_DIR}/stations.json`, res)
		await new Promise(resolve => setTimeout(resolve, AN_HOUR));
	} while (true);
}

function printStatuses(statuses: StationStatus[]) {
	function sumStatusCodes(statuses: StationStatus[], statusCode: number) {
		return statuses.reduce((accumulator: number, status: StationStatus) => {
			return accumulator + status.connectors.reduce(
				(acc: number, connector: Connector) => acc + (connector.status === statusCode ? 1 : 0), 0);
		}, 0);
	}

	const availableConnectors = sumStatusCodes(statuses, STATUS_AVAILABLE)
	const unknownConnectors = sumStatusCodes(statuses, STATUS_UNKNOWN);
	const occupiedConnectors = sumStatusCodes(statuses, STATUS_OCCUPIED)
	const errorConnectors = sumStatusCodes(statuses, STATUS_ERROR)
	const totalConnectors = statuses.reduce(
		(accumulator: number, station: StationStatus) => accumulator + station.connectors.length, 0);

	return `< Ledig: ${availableConnectors} 	Opptatt: ${occupiedConnectors} 	E: ${errorConnectors} 	U: ${unknownConnectors} 	T: ${totalConnectors}`;
}

