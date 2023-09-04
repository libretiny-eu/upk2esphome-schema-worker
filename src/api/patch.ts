//// @ts-nocheck

import * as qs from "qs"
import {
	TuyaContext,
	TuyaOpenApiClientRequestBodyBase,
	TuyaOpenApiClientRequestHeaderBase,
	TuyaOpenApiClientRequestQueryBase,
} from "@tuya/tuya-connector-nodejs"
import { bin2hex, sha256 } from "../utils"

async function sign(str: string, secret: string) {
	const text = new TextEncoder().encode(str)
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	)
	const digest = await crypto.subtle.sign("HMAC", key, text)
	return bin2hex(digest).toUpperCase()
}

function toJson(obj: any): string | null {
	return Object.keys(obj || {}).length ? JSON.stringify(obj) : null
}

export function patchContext(tuya: TuyaContext) {
	// @ts-ignore
	tuya.client.rpc = async (request) => {
		console.log(JSON.stringify(request, null, 4))
		const r = await fetch(request.url as string, {
			method: request.method,
			headers: request.headers,
			body: toJson(request.data),
		})
		const responseText = await r.text()
		console.log(responseText)
		const response = {
			data: JSON.parse(responseText),
		}
		return response
	}
	// @ts-ignore
	tuya.client.rpc.request = tuya.client.rpc

	tuya.client.getSignHeaders = async function (
		path: string,
		method: string,
		query: TuyaOpenApiClientRequestQueryBase,
		body: TuyaOpenApiClientRequestBodyBase,
	) {
		const t = Date.now().toString()
		const [uri, pathQuery] = path.split("?")
		const queryMerged = Object.assign(query, qs.parse(pathQuery))
		const sortedQuery: { [k: string]: string } = {}
		Object.keys(queryMerged)
			.sort()
			.forEach((i) => (sortedQuery[i] = query[i]))
		const querystring = qs.stringify(sortedQuery)
		const url = querystring ? `${uri}?${querystring}` : uri
		// @ts-ignore
		let accessToken = (await this.store.getAccessToken()) || ""
		if (!accessToken) {
			await this.init()
			// @ts-ignore
			accessToken = (await this.store.getAccessToken()) || ""
		}
		const contentHash = await sha256(toJson(body) ?? "")
		const stringToSign = [
			method,
			contentHash,
			"",
			decodeURIComponent(url),
		].join("\n")
		// @ts-ignore
		const signStr = this.accessKey + accessToken + t + stringToSign
		return {
			t,
			path: url,
			// @ts-ignore
			client_id: this.accessKey,
			// @ts-ignore
			sign: await sign(signStr, this.secretKey),
			sign_method: "HMAC-SHA256",
			access_token: accessToken,
			Dev_channel: "SaaSFramework",
			Dev_lang: "Nodejs",
		}
	}

	tuya.client.refreshSignV2 = async function (
		t: string,
		headers: TuyaOpenApiClientRequestHeaderBase,
	) {
		const nonce = ""
		const method = "GET"
		const signUrl = "/v1.0/token?grant_type=1"
		const contentHash = await sha256("")
		const signHeaders = Object.keys(headers)
		const signHeaderStr = Object.keys(signHeaders).reduce(
			(pre, cur, idx) => {
				return `${pre}${cur}:${headers[cur]}${
					idx === signHeaders.length - 1 ? "" : "\n"
				}`
			},
			"",
		)
		const stringToSign = [method, contentHash, signHeaderStr, signUrl].join(
			"\n",
		)
		// @ts-ignore
		const signStr = this.accessKey + t + nonce + stringToSign
		return {
			// @ts-ignore
			sign: await sign(signStr, this.secretKey),
			signHeaders: signHeaders.join(":"),
		}
	}

	tuya.client.requestSignV2 = async function (
		t: string,
		headers: TuyaOpenApiClientRequestHeaderBase,
		body: TuyaOpenApiClientRequestBodyBase,
	) {
		// @ts-ignore
		let accessToken = await this.store.getAccessToken()
		if (!accessToken) {
			await this.init()
			// @ts-ignore
			accessToken = await this.store.getAccessToken()
		}
		const nonce = ""
		const method = "GET"
		const signUrl = "/v1.0/token?grant_type=1"
		const bodyStr = toJson(body) ?? ""
		const contentHash = await sha256(bodyStr)
		const signHeaders = Object.keys(headers)
		const signHeaderStr = Object.keys(signHeaders).reduce(
			(pre, cur, idx) => {
				return `${pre}${cur}:${headers[cur]}${
					idx === signHeaders.length - 1 ? "" : "\n"
				}`
			},
			"",
		)
		const stringToSign = [method, contentHash, signHeaderStr, signUrl].join(
			"\n",
		)
		// @ts-ignore
		const signStr = this.accessKey + accessToken + t + nonce + stringToSign
		return {
			// @ts-ignore
			sign: await sign(signStr, this.secretKey),
			signHeaders: signHeaders.join(":"),
		}
	}
}
