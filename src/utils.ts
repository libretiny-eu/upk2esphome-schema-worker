export function bin2hex(array: ArrayBuffer): string {
	return [...new Uint8Array(array)]
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("")
}

export async function sha256(data: string): Promise<string> {
	const text = new TextEncoder().encode(data)
	const digest = await crypto.subtle.digest("SHA-256", text)
	return bin2hex(digest)
}

export async function md5(data: string): Promise<string> {
	const text = new TextEncoder().encode(data)
	const digest = await crypto.subtle.digest("MD5", text)
	return bin2hex(digest)
}

export function b64decode(data: string): Uint8Array {
	return Uint8Array.from(atob(data), (c) => c.charCodeAt(0))
}
