import { TuyaContextOptions } from "@tuya/tuya-connector-nodejs"

export type ObjectType = {
	[key: string]: any
}

export type ProjectData = {
	baseUrl: string
	accessKey: string
	secretKey: string
	assetId: string
	pairingType?: "ap" | "ez" | "ble"
	timeZoneId?: string
}

export type LicenseData = {
	uuid: string
	authKey: string
}

export type RequestContext = {
	request: {
		method: string
		url: string
		headers: ObjectType
		params?: ObjectType
		data?: ObjectType
		body?: string
	} | null

	response: {
		code: number
		headers: ObjectType
		data?: ObjectType
		body?: any
	} | null
}
