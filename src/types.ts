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
