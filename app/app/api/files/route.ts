import DBFiles from "@/lib/db/DBFiles"
import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest): Promise<NextResponse> {
	const token = cookies().get("token")
	if(token === undefined) {
		return NextResponse.json({message: "not logged in"}, {status: 403})
	}

	const files = await DBFiles.GetFilesOfUser({TOKEN: token.value})
	return NextResponse.json({
		files: files
	}, {
		status: 200
	})
}