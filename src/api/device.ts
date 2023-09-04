import aesEcb from "aes-ecb"
import { pad } from "pkcs7-padding"
import { ObjectType } from "../types"
import { b64decode, bin2hex, md5 } from "../utils"

type DeviceResponse = {
	t: number
	success: boolean
	result?: string
	errorCode?: string
	errorMsg?: string
}

export class TuyaAPIConnection {
	devId: string | null = null
	secKey: string | null = null

	constructor(
		private url: string,
		private uuid: string,
		private authKey: string,
	) {}

	async rawRequest<T>(
		key: string,
		url: string,
		params: ObjectType,
		data: ObjectType,
		method: "GET" | "POST" = "POST",
	): Promise<T> {
		const parsedUrl = new URL(url)
		const queryString = await this.buildQueryString(key, params)
		const requestLine = parsedUrl.pathname + queryString
		const body = await this.encryptData(key, JSON.stringify(data))

		const headers = new Headers()
		headers.set("User-Agent", "TUYA_IOT_SDK")
		headers.set("Connection", "keep-alive")
		headers.set(
			"Content-Type",
			"application/x-www-form-urlencoded; charset=UTF-8",
		)

		console.log(
			"device API request",
			key,
			url,
			JSON.stringify(params),
			JSON.stringify(data),
			method,
		)

		const r = await fetch(`http://${parsedUrl.hostname}${requestLine}`, {
			method: method,
			headers: headers,
			body: body,
		})
		const result = await r.json<DeviceResponse>()
		if (result.success === false)
			throw Error(`${result.errorCode}: ${result.errorMsg}`)

		const decrypted = await this.decryptData(key, result.result!!)
		const decryptedResult = JSON.parse(decrypted)
		if (decryptedResult.success === false)
			throw Error(
				`${decryptedResult.errorCode}: ${decryptedResult.errorMsg}`,
			)
		console.log("device API response", JSON.stringify(decryptedResult))
		return decryptedResult.result
	}

	async encryptData(key: string, data: string): Promise<string> {
		const encrypted = aesEcb.encrypt(key.substring(0, 16), pad(data))
		const encryptedArray = b64decode(encrypted)
		return `data=${bin2hex(encryptedArray).toUpperCase()}`
	}

	async decryptData(key: string, data64: string): Promise<string> {
		return aesEcb.decrypt(key.substring(0, 16), data64)
	}

	async buildQueryString(key: string, params: ObjectType): Promise<string> {
		const keys = Object.keys(params).sort()
		let query = keys
			.map((k) => `${k}=${encodeURIComponent(params[k])}`)
			.join("&")
		let signatureBody = query.replaceAll("&", "||")
		signatureBody += `||${key}`
		const signature = await md5(signatureBody)
		query += `&sign=` + signature
		return `?${query}`
	}

	async request<T>(
		a: string,
		v: string,
		data: ObjectType = {},
		forceUuid: boolean = false,
	): Promise<T> {
		const useUuid = !this.devId || forceUuid
		const authKey = useUuid ? this.authKey : this.secKey!!

		const t = Math.round(Date.now() / 1000)
		data["t"] = t

		const params: ObjectType = { a, t, v, et: 1 }
		if (useUuid) params["uuid"] = this.uuid
		else params["devId"] = this.devId
		return await this.rawRequest(authKey, this.url, params, data, "POST")
	}
}
