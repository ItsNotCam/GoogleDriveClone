import { RowDataPacket } from "mysql2/promise"
import Logger from "../logger"
import { QueryGetFirst, CreateConnection, IDtoSQL } from "./DBUtil"

export interface IDBFile {
	ID: string,
	NAME: string,
	EXTENSION: string,
	FILENAME: string,
	DESCRIPTION: string,
	SIZE_BYTES: number,
	UPLOAD_TIME: Date,
	LAST_DOWNLOAD_TIME: Date | undefined,
	LAST_DOWNLOAD_USER_ID: string | undefined,
	IS_OWNER: boolean,
	PARENT_FOLDER_ID: string,
	PARENT_FOLDER_NAME: string,

	OWNER_USERNAME: string,
	SHARED_USERS: string[]
}

interface IFileData {
	FILENAME: string
	INTERNAL_FILE_PATH: string
}

interface IUserIdentifier {
	TOKEN?: string,
	USER_ID?: string
}

export default abstract class DBFile {
	static async GetFileForDownload(FILE_ID: string, userIdentifier: IUserIdentifier): Promise<IFileData | undefined> {
		// get file name and internal file path only if the user owns the file
		const SQL: string = `
        SELECT CONCAT(NAME, EXTENSION) AS FILENAME, INTERNAL_FILE_PATH 
        FROM FILE_OBJECT AS FO
          INNER JOIN FILE_INSTANCE AS FI ON FO.ID=FI.FILE_ID
          INNER JOIN AUTH ON TOKEN='${userIdentifier.TOKEN}'
        WHERE FO.ID='${FILE_ID}'
          AND FI.USER_ID=(SELECT USER_ID FROM AUTH WHERE TOKEN='${userIdentifier.TOKEN}')
      `

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}
			return await QueryGetFirst(connection, SQL)
		} catch (err: any) {
			Logger.LogErr(`Error getting file info for download | ${err.message}`)
		} finally {
			connection?.end()
		}

		return undefined
	}

	static async GetFileInfo(
		FILE_ID: string, identifier: { TOKEN?: string, USER_ID?: string }): Promise<IDBFile | undefined> 
	{
		const { TOKEN, USER_ID } = identifier;
		let SQL = ""

		if (TOKEN !== undefined) {
			SQL = `
				SELECT 
					FO.ID, FI.NAME, FO.EXTENSION, CONCAT(FI.NAME, FO.EXTENSION) AS FILENAME, FI.DESCRIPTION, 
					FO.SIZE_BYTES, FO.UPLOAD_TIME, FO.LAST_DOWNLOAD_TIME, FO.LAST_DOWNLOAD_USER_ID,
					FI.IS_OWNER, FI.PARENT_FOLDER_ID, D.NAME AS PARENT_FOLDER_NAME
				FROM FILE_INSTANCE AS FI
					INNER JOIN USER AS U ON U.ID = USER_ID 
					INNER JOIN FILE_OBJECT AS FO ON FO.ID = FILE_ID	
					INNER JOIN AUTH ON AUTH.USER_ID=U.ID
					INNER JOIN DIRECTORY AS D ON D.ID=FI.PARENT_FOLDER_ID
				WHERE AUTH.TOKEN='${TOKEN}' AND FO.ID='${FILE_ID}';
			`
		} else if (USER_ID !== undefined) {
			SQL = `
				SELECT 
					FO.ID, FI.NAME, FO.EXTENSION, CONCAT(FI.NAME, FO.EXTENSION) AS FILENAME, FI.DESCRIPTION, 
					FO.SIZE_BYTES, FO.UPLOAD_TIME, FO.LAST_DOWNLOAD_TIME, FO.LAST_DOWNLOAD_USER_ID,
					FI.IS_OWNER, FI.PARENT_FOLDER_ID, D.NAME AS PARENT_FOLDER_NAME
				FROM FILE_INSTANCE AS FI
					INNER JOIN USER AS U ON U.ID = USER_ID 
					INNER JOIN FILE_OBJECT AS FO ON FO.ID = FILE_ID	
					INNER JOIN AUTH ON AUTH.USER_ID=U.ID
					INNER JOIN DIRECTORY AS D ON D.ID=FI.PARENT_FOLDER_ID
				WHERE U.ID='${USER_ID}' AND FO.ID='${FILE_ID}';
			`
		}

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}

			let file: IDBFile = await QueryGetFirst(connection, SQL) as IDBFile;
			if (file === undefined) {
				throw { message: `User ${USER_ID} failed to retrieve file ${FILE_ID} - no such file exists` }
			} else {
				file.IS_OWNER = (file.IS_OWNER as any).readInt8() // i have it as a bit in the database so i have to read the output here

				// get all users of file
				let USERS_SQL: string = `
					SELECT USERNAME, IS_OWNER
					FROM USER
						INNER JOIN FILE_INSTANCE ON USER_ID=USER.ID 
					WHERE FILE_INSTANCE.FILE_ID='${file.ID}'
					ORDER BY IS_OWNER DESC
				`

				file.SHARED_USERS = []
				const userResp = await connection.query(USERS_SQL)
				const entry = await userResp.entries().next()
				entry.value[1].forEach((v: any) => {
					file.SHARED_USERS?.push(v.USERNAME)
					const owner = (v.IS_OWNER as any).readInt8()
					if (owner === 1) {
						file.OWNER_USERNAME = v.USERNAME
					}
				})

				return file
			}
		} catch (err: any) {
			Logger.LogErr(`Error getting file info | ${err.message}`)
		} finally {
			await connection?.end()
		}
		return undefined
	}

	static async GetFilesInFolder(identifier: { USER_ID?: string, TOKEN?: string }, FOLDER_ID: string): Promise<IDBFile[]> {
		const { USER_ID, TOKEN } = identifier

		let DATA_SQL: string = ""
		if (USER_ID !== undefined) {
			DATA_SQL = `
				SELECT 
					FO.ID, FI.NAME, FO.EXTENSION, CONCAT(FI.NAME, FO.EXTENSION), FI.DESCRIPTION, 
					FO.SIZE_BYTES, FO.UPLOAD_TIME, FO.LAST_DOWNLOAD_TIME, FO.LAST_DOWNLOAD_USER_ID,
					FI.IS_OWNER, FI.PARENT_FOLDER_ID, D.NAME AS PARENT_FOLDER_NAME
				FROM FILE_INSTANCE AS FI
					INNER JOIN USER AS U ON U.ID = USER_ID 
					INNER JOIN FILE_OBJECT AS FO ON FO.ID = FILE_ID	
					INNER JOIN DIRECTORY AS D ON D.ID=FI.PARENT_FOLDER_ID
				WHERE U.ID='${USER_ID}' AND FI.PARENT_FOLDER_ID='${FOLDER_ID}'
				ORDER BY FO.UPLOAD_TIME DESC;
			`
		} else if (TOKEN !== undefined) {
			DATA_SQL = `
				SELECT 
					FO.ID, FI.NAME, FO.EXTENSION, CONCAT(FI.NAME, FO.EXTENSION), FI.DESCRIPTION, 
					FO.SIZE_BYTES, FO.UPLOAD_TIME, FO.LAST_DOWNLOAD_TIME, FO.LAST_DOWNLOAD_USER_ID,
					FI.IS_OWNER, FI.PARENT_FOLDER_ID, D.NAME AS PARENT_FOLDER_NAME
				FROM FILE_INSTANCE AS FI
					INNER JOIN USER AS U ON U.ID = USER_ID 
					INNER JOIN FILE_OBJECT AS FO ON FO.ID = FILE_ID	
					INNER JOIN AUTH ON AUTH.USER_ID=U.ID
					INNER JOIN DIRECTORY AS D ON D.ID=FI.PARENT_FOLDER_ID
				WHERE AUTH.TOKEN='${TOKEN}' AND FI.PARENT_FOLDER_ID='${FOLDER_ID}'
				ORDER BY FO.UPLOAD_TIME DESC;
			`
		}

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}

			const resp = await connection.query(DATA_SQL)
			const files: IDBFile[] = resp[0] as IDBFile[]
			for (let i = 0; i < files.length; i++) {
				files[i].IS_OWNER = (files[i].IS_OWNER as any).readInt8() // i have it as a bit in the database so i have to read the output here

				// get all users of file
				let USERS_SQL: string = `
					SELECT USERNAME, IS_OWNER
					FROM USER
					INNER JOIN FILE_INSTANCE ON USER_ID=USER.ID 
					WHERE FILE_INSTANCE.FILE_ID='${files[i].ID}'
					ORDER BY IS_OWNER DESC
				`

				files[i].SHARED_USERS = [] as string[]
				const userResp = await connection.query(USERS_SQL)
				const entry = await userResp.entries().next()
				entry.value[1].forEach((v: any) => {
					files[i].SHARED_USERS.push(v.USERNAME)
					const owner = (v.IS_OWNER as any).readInt8()
					if (owner === 1) {
						files[i].OWNER_USERNAME = v.USERNAME
					}
				})
			}

			return files
		} catch (err: any) {
			Logger.LogErr(`Error getting user ${USER_ID}'s file info | ${err.message}`)
		} finally {
			await connection?.end()
		}

		return []
	}

	static async GetFilesOfUser(identifier: { USER_ID?: string, TOKEN?: string }, FOLDER_ID: string | null): Promise<IDBFile[]> {
		const { USER_ID, TOKEN } = identifier

		const FOLDER_SQL = FOLDER_ID !== null ? `AND FI.PARENT_FOLDER_ID='${FOLDER_ID}'` : ""

		let DATA_SQL: string = ""
		if (USER_ID !== undefined) {
			DATA_SQL = `
				SELECT 
					FO.ID, FI.NAME, FO.EXTENSION, CONCAT(FI.NAME, FO.EXTENSION), FI.DESCRIPTION, 
					FO.SIZE_BYTES, FO.UPLOAD_TIME, FO.LAST_DOWNLOAD_TIME, FO.LAST_DOWNLOAD_USER_ID,
					FI.IS_OWNER, FI.PARENT_FOLDER_ID, D.NAME AS PARENT_FOLDER_NAME
				FROM FILE_INSTANCE AS FI
					INNER JOIN USER AS U ON U.ID = USER_ID 
					INNER JOIN FILE_OBJECT AS FO ON FO.ID = FILE_ID	
					INNER JOIN DIRECTORY AS D ON FI.PARENT_FOLDER_ID=D.ID
				WHERE U.ID='${USER_ID}' ${FOLDER_SQL}
				ORDER BY FO.UPLOAD_TIME DESC;
			`
		} else if (TOKEN !== undefined) {
			DATA_SQL = `
				SELECT 
					FO.ID, FI.NAME, FO.EXTENSION, CONCAT(FI.NAME, FO.EXTENSION), FI.DESCRIPTION, 
					FO.SIZE_BYTES, FO.UPLOAD_TIME, FO.LAST_DOWNLOAD_TIME, FO.LAST_DOWNLOAD_USER_ID,
					FI.IS_OWNER, FI.PARENT_FOLDER_ID, D.NAME AS PARENT_FOLDER_NAME
				FROM FILE_INSTANCE AS FI
					INNER JOIN USER AS U ON U.ID = USER_ID 
					INNER JOIN FILE_OBJECT AS FO ON FO.ID = FILE_ID	
					INNER JOIN AUTH ON AUTH.USER_ID=U.ID
					INNER JOIN DIRECTORY AS D ON FI.PARENT_FOLDER_ID=D.ID
				WHERE AUTH.TOKEN='${TOKEN}' ${FOLDER_SQL}
				ORDER BY FO.UPLOAD_TIME DESC;
			`
		}

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}

			const resp = await connection.query(DATA_SQL)
			const files: IDBFile[] = resp[0] as IDBFile[]
			for (let i = 0; i < files.length; i++) {
				files[i].IS_OWNER = (files[i].IS_OWNER as any).readInt8() // i have it as a bit in the database so i have to read the output here

				// get all users of file
				let USERS_SQL: string = `
					SELECT USERNAME, IS_OWNER
					FROM USER
						INNER JOIN FILE_INSTANCE ON USER_ID=USER.ID 
					WHERE FILE_INSTANCE.FILE_ID='${files[i].ID}'
					ORDER BY IS_OWNER DESC
				`

				files[i].SHARED_USERS = [] as string[]
				const userResp = await connection.query(USERS_SQL)
				const entry = await userResp.entries().next()
				entry.value[1].forEach((v: any) => {
					files[i].SHARED_USERS.push(v.USERNAME)
					const owner = (v.IS_OWNER as any).readInt8()
					if (owner === 1) {
						files[i].OWNER_USERNAME = v.USERNAME
					}
				})
			}

			return files
		} catch (err: any) {
			Logger.LogErr(`Error getting user ${USER_ID}'s file info | ${err.message}`)
		} finally {
			await connection?.end()
		}

		return []
	}

	static async UserIsOwner(FILE_ID: string, 
		identifier: { USER_ID?: string, TOKEN?: string, USERNAME?: string }
	): Promise<boolean> {
		const { USER_ID, TOKEN, USERNAME } = identifier

		let SQL = `
      SELECT COUNT(*) AS COUNT
      FROM FILE_INSTANCE
      WHERE FILE_ID='${FILE_ID}' AND IS_OWNER=1 AND USER_ID=
    `

		if (USER_ID) {
			SQL += `'${USER_ID}'`
		} else if(TOKEN) {
			SQL += `(SELECT USER_ID FROM AUTH WHERE TOKEN='${TOKEN}' LIMIT 1)`
		} else if(USERNAME) {
			SQL += `(SELECT ID FROM USER WHERE USERNAME='${USERNAME}')`
		}

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}
			const resp = await QueryGetFirst(connection, SQL)
			return resp.COUNT > 0;
		} catch (err: any) {
			Logger.LogErr(`Error checking if user is owner | ${err.message}`)
		} finally {
			connection?.end()
		}
		return false
	}

	static async UpdateFileInfo(
		FILE_ID: string,
		identifier: { TOKEN?: string, USER_ID?: string },
		info: { DESCRIPTION?: string, NAME?: string }
	): Promise<IDBFile | undefined> {
		const { TOKEN, USER_ID } = identifier
		const { DESCRIPTION, NAME } = info

		if (!TOKEN && !USER_ID) {
			return undefined
		}

		if (!DESCRIPTION && !NAME) {
			return undefined;
		}

		/*
			GENERATE SQL QUERY
	  
      -- RESULT --
			UPDATE FILE_INSTANCE
			SET DESCRIPTION='...', NAME='...'
			WHERE FILE_ID='...' AND USER_ID = [USER_ID] || (SELECT USER_ID FROM AUTH WHERE TOKEN='...')
		*/
		let SQL = `UPDATE FILE_INSTANCE SET`
		let updatedFields: string[] = []
		if (DESCRIPTION) {
			updatedFields.push(`DESCRIPTION='${DESCRIPTION}'`)
		}
		if (NAME) {
			updatedFields.push(`NAME='${NAME}'`)
		}

		SQL += ` ${updatedFields.join(",")} 
			WHERE FILE_ID='${FILE_ID}' 
			AND USER_ID=${IDtoSQL(identifier)}`

    /* END GENERATE SQL QUERY */

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}
			await connection.execute(SQL)
			return await this.GetFileInfo(FILE_ID, identifier);
		} catch (err: any) {
			Logger.LogErr(`Error updating file info | ${err.message}`)
		} finally {
			connection?.end()
		}

		return undefined;
	}

	static async Unshare(FILE_ID: string, 
		identifier: { USER_ID?: string, TOKEN?: string }, 
		username?: string
	): Promise<string[] | undefined> {
		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}

			const userIsOwner = await DBFile.UserIsOwner(FILE_ID, {USERNAME: username})
			if(userIsOwner) {
				throw {message: "User attempted to unshare a file that they owned"}
			}

			let DEL_SQL = `
				DELETE FROM FILE_INSTANCE WHERE USER_ID=(
					SELECT ID FROM USER WHERE USERNAME='${username}'
				) AND FILE_ID='${FILE_ID}'
			`

			const resp: RowDataPacket[] = await connection.execute(DEL_SQL) as RowDataPacket[]
			const affectedRows = resp[0].affectedRows;
			if(affectedRows > 0) {
				const UPDATED_SQL = `
					SELECT USERNAME
					FROM FILE_INSTANCE 
					INNER JOIN USER ON USER_ID=ID
					WHERE FILE_ID='${FILE_ID}'
				`
				const sharedUsersResp = await connection.query(UPDATED_SQL)
				const sharedUsers = (sharedUsersResp[0] as any).map((user: any) => (user as any).USERNAME)
				return sharedUsers
			}
		} catch (err: any) {
			Logger.LogErr(`Error deleting file | ${err.message}`)
		} finally {
			connection?.end()
		}

		return undefined
	}

	static async DeleteFile(FILE_ID: string, identifier: { USER_ID?: string, TOKEN?: string }): Promise<string | undefined> {
		const { USER_ID, TOKEN } = identifier

		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}
			// get the file path of the saved file
			const userIsOwner = await DBFile.UserIsOwner(FILE_ID, {
				USER_ID: USER_ID,
				TOKEN: TOKEN
			})
			if (!userIsOwner) {
				throw {message: `User is not the owner of the file`}
			}

			const SQL: string = `
        SELECT INTERNAL_FILE_PATH 
        FROM FILE_OBJECT 
        WHERE ID='${FILE_ID}'
      `
			const PATH: string = (await QueryGetFirst(connection, SQL)).INTERNAL_FILE_PATH

			// remove from tables
			let OWN_SQL: string = `DELETE FROM FILE_INSTANCE WHERE FILE_ID='${FILE_ID}'`
			await connection.execute(OWN_SQL)
			let COMM_SQL: string = `DELETE FROM COMMENT WHERE FILE_ID='${FILE_ID}'`
			await connection.execute(COMM_SQL)
			let FILE_SQL: string = `DELETE FROM FILE_OBJECT WHERE ID='${FILE_ID}'`
			await connection.execute(FILE_SQL)

			return PATH;
		} catch (err: any) {
			Logger.LogErr(`Error deleting file | ${err.message}`)
		} finally {
			connection?.end()
		}

		return undefined;
	}

	static async SaveFile(FILE_ID: string, NAME: string,
		EXTENSION: string, USER_ID: string, PATH: string, 
    FILE_SIZE: number, FOLDER_ID: string | null
  ): Promise<boolean> {
		let { connection, err } = await CreateConnection()
		try {
			if (connection === null) {
				throw { message: `Failed to connect to database => ${err}` }
			}
			let SQL: string = `INSERT INTO FILE_OBJECT VALUES (
				'${FILE_ID}', '${EXTENSION}', '${PATH}', ${FILE_SIZE}, 
				DEFAULT, NULL, NULL
			);`
			await connection.query(SQL);

			const FOLDER_SQL = FOLDER_ID === null
				? `(SELECT ID FROM DIRECTORY WHERE PARENT_ID IS NULL AND OWNER_ID='${USER_ID}')`
				: `'${FOLDER_ID}'`

			SQL = `INSERT INTO FILE_INSTANCE VALUES (
				'${USER_ID}', '${FILE_ID}',
        ${FOLDER_SQL}, 1, '${NAME}', 
        ""
			)`;
			await connection.query(SQL);

			return true;
		} catch (err: any) {
			Logger.LogErr(`Error saving file to database | ${err.message}`)
		} finally {
			connection?.end()
		}

		return false;
	}

	/*
	static async UserHasAccessToFile(
		FILE_ID: string, 
		identifier: { TOKEN?: string, USER_ID?: string }): Promise<boolean> 
	{
		// const SQL = `SELECT COUNT(*) AS COUNT FROM ${}`
		return false
	}	

	static async MoveFileToFolder(
		identifier: {USER_ID?: string, TOKEN?: string}, 
		FILE_ID: string, 
		NEW_FOLDER_ID: string
	){
		const isOwner: boolean = await this.UserHasAccessToFile(FILE_ID, identifier)
	}
	*/
}