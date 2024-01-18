// User actions
import { CreateConnection } from "@/app/_helpers/db";
import { NextRequest, NextResponse } from "next/server";
import mysql from 'mysql2/promise'
import { IFileProps, IUserProps } from "@/app/_helpers/types";

async function DeleteUserByID(request: NextRequest, context: { params: any }): Promise<NextResponse> {
  const USER_ID: string = context.params.USER_ID;

  const connection: mysql.Connection = await CreateConnection(true)

  const OWNER_SQL: string = `DELETE FROM OWNERSHIP WHERE USER_ID='${USER_ID}';`
  const USER_SQL: string = `DELETE FROM USER WHERE ID='${USER_ID}'`
  const COMMENT_SQL: string = `DELETE FROM COMMENT WHERE USER_ID='${USER_ID}'`

  await connection.execute(OWNER_SQL)
  await connection.execute(USER_SQL)
  await connection.execute(COMMENT_SQL)

  return NextResponse.json({ message: "success" }, { status: 200 })
}

async function GetUserByID(USER_ID: string): Promise<IUserProps> {
  const connection: mysql.Connection = await CreateConnection(false)
  // const SQL: string = `SELECT * FROM USER WHERE ID='${USER_ID}'`
  const SQL: string = `SELECT * FROM USER WHERE ID='${USER_ID}'`
  const resp = await connection.execute(SQL)
    .then(resp => resp.entries())
    .then(entries => entries.next().value)
    .then(value => value[1][0])
  
  return resp
}

async function GET(request: NextRequest, context: { params: any }): Promise<NextResponse> {
  const includeFiles: string = request.nextUrl.searchParams.get("include_files") || "false"
  const USER_ID: string = context.params.USER_ID
  const userData: IUserProps = await GetUserByID(USER_ID)

  let js: object = userData;
  if(includeFiles != null && includeFiles === 'true') {
    const FILES: IFileProps[] = await GetFilesFromUserWithID(USER_ID)
    js = { ...userData, FILES }
  }

  return NextResponse.json(js, { status: 200 })
}

export {DeleteUserByID as DELETE, GET, GetUserByID as GetUserByID, DeleteUserByID as DeleteUserByID}
function GetFilesFromUserWithID(USER_ID: string): IFileProps[] | PromiseLike<IFileProps[]> {
  throw new Error("Function not implemented.");
}

