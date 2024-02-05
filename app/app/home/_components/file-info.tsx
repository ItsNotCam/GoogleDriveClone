import { IDBFile } from "@/lib/db/DBFiles";
import FileIcon from "./file-icon";
import { calcFileSize, toDateString } from "@/lib/util";
import React, { useEffect, useState } from "react";
import Scrollable from "@/lib/scrollable";

const defaultFile: IDBFile = {
	DESCRIPTION: "",
	EXTENSION: "",
	FILENAME: "Select a file :)",
	ID: "",
	IS_OWNER: true,
	LAST_DOWNLOAD_TIME: new Date(),
	LAST_DOWNLOAD_USER_ID: "",
	NAME: "",
	SIZE_BYTES: 0,
	UPLOAD_TIME: new Date()
}

const MAX_DESCRIPTION_LENGTH: number = 5000;

export default function FileInfo(props: { file: IDBFile, refreshInfo: () => void }): JSX.Element {
	let file: IDBFile = props.file === undefined ? defaultFile : props.file
	const fileIcon: JSX.Element = FileIcon({ extension: file.EXTENSION })

	const [description, setDescription] = useState<string>(file.DESCRIPTION)
	const [name, setName] = useState<string>(file.NAME)

	const getUnfocus = (e: React.FocusEvent) => {
		if (description !== file.DESCRIPTION) {
			fetch(`/api/files/${file.ID}`, {
				method: "PATCH",
				body: JSON.stringify({
					description: description
				})
			}).then(() => props.refreshInfo())
		}

		if (name !== file.NAME) {
			console.log("ok")
			fetch(`/api/files/${file.ID}`, {
				method: "PATCH",
				body: JSON.stringify({
					name: name
				})
			}).then(() => props.refreshInfo())
		}
	}

	const updateDescription = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setDescription(e.target.value.substring(0, MAX_DESCRIPTION_LENGTH))
	}

	const updateName = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
		setName(e.target.value)
	}

	const fileInfo = [
		["Type", file.EXTENSION || "none"],
		["Size", `${calcFileSize(file.SIZE_BYTES)}`],
		["Owner", file.IS_OWNER ? "me" : "someone else"],
		["Uploaded", toDateString(file.UPLOAD_TIME)]
	]

	useEffect(() => {
		setDescription(file.DESCRIPTION)
	}, [file.DESCRIPTION])

	useEffect(() => {
		setName(file.NAME)
	}, [file.NAME])

	return (
		<>
			<div className="file-info-static">
				<div className="file-info-header">
					<h1 className="font-semibold">
						<span>{fileIcon}</span>
						<p className="text-lg">{file.NAME}{file.EXTENSION}</p>
					</h1>
					<span className="file-info-icon">
						{fileIcon}
					</span>
					<p className="file-access-text font-semibold">Who has access</p>
					{file.IS_OWNER
						? <AccessList />
						: <p className="font-light text-sm text-left w-5/6 mb-5">
							You do not have permission to view sharing information for this item
						</p>
					}
					{file.IS_OWNER ? <button className="access-btn">Manage access</button> : ""}
				</div>
				<div className="horizontal-divider"></div>
				<h1 className="file-info-details-title font-semibold">File Details</h1>
			</div>
			<Scrollable padding="0 2rem">
				<div className="file-info-details">
					{fileInfo.map((fi, i) =>
						<p key={`fi${i}`}>
							<span className="font-semibold">{fi[0]}</span>
							<br />
							<span>{fi[1]}</span>
						</p>
					)}
					<div className="file-info-description">
						<span className="pb-1.5 font-semibold">Description</span>
						<textarea
							className="text-sm"
							value={description}
							onChange={updateDescription}
							onBlur={getUnfocus}
						/>
						<span className="text-xs">{descLengthtoStr(description?.length)} / 5,000</span>
					</div>
				</div>
			</Scrollable>
		</>
	)
}

const descLengthtoStr = (l: number) => {
	if (l / 1000 >= 1) {
		const lengthToString = `000${l % 1000}`.slice(-3)
		return `${Math.floor(l / 1000)},${lengthToString}`
	} else {
		return `${l}`
	}
}

function AccessList() {
	return (
		<div className="access-list">
			<p>Me</p>
		</div>
	)
}