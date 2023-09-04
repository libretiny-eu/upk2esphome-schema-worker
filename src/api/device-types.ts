export type DeviceActiveResponse = {
	schema: string
	devId: string
	resetFactory: boolean
	timeZone: string
	secKey: string
	stdTimeZone: string
	schemaId: string
	dstIntervals: [number, number][]
	localKey: string
}
