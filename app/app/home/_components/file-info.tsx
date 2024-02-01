import { IDBFile } from "@/lib/db/DBFiles";
import FileIcon from "./file-icon";
import { calcFileSize, toDateString } from "@/lib/util";
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const defaultFile: IDBFile = {
	DESCRIPTION: "",
	EXTENSION: "",
	FILENAME: "",
	ID: "",
	IS_OWNER: false,
	LAST_DOWNLOAD_TIME: new Date(),
	LAST_DOWNLOAD_USER_ID: "",
	NAME: "",
	SIZE_BYTES: 0,
	UPLOAD_TIME: new Date()
}

export default function FileInfo(props: { file: IDBFile, refreshInfo: () => void }): JSX.Element {
	let file: IDBFile = props.file === undefined ? defaultFile : props.file
	const fileIcon: JSX.Element = FileIcon({ extension: file.EXTENSION })

	const [description, setDescription] = useState<string>(file.DESCRIPTION)

	const getUnfocus = (e: React.FocusEvent) => {
		if(description !== file.DESCRIPTION) {
			fetch(`/api/files/${file.ID}`, {
				method: "PATCH",
				body: JSON.stringify({
					description: description
				})
			}).then(() => props.refreshInfo())
		}
	}

	const fileInfo = [
		["Type", file.EXTENSION],
		["Size", `${calcFileSize(file.SIZE_BYTES)}`],
		["Owner", file.IS_OWNER ? "me" : "someone else"],
		["Uploaded", toDateString(file.UPLOAD_TIME)]
	]

	useEffect(() => {
		setDescription(file.DESCRIPTION)
	}, [file.DESCRIPTION])

	return (<>
		<h1 className="file-info-name font-semibold">
			<span>{fileIcon}</span>
			<p>{file.FILENAME}</p>
		</h1>
		<div className="file-icon-centered">
			{fileIcon}
		</div>
		<div className="file-access text-left">
			<p className="font-semibold">Who has access</p>
			{file.IS_OWNER 
				? <AccessList /> 
				: <p className="font-light text-sm text-left w-5/6 mb-5">
						You do not have permission to view sharing information for this item
					</p>
			}
			{file.IS_OWNER ? <button className="ft-btn">Manage access</button> : ""}
		</div>
		<div className="horizontal-divider"></div>
		<div className="file-details">
			<h1>File Details</h1>
			{fileInfo.map((fi,i) => 
				<p key={`fi${i}`} className="file-detail">
					<span className="file-detail-header">{fi[0]}</span>
					<br />
					<span className="file-detail-info">{fi[1]}</span>
				</p>
			)}
			<div className="file-detail">
				<span className="file-detail-header pb-1.5">Description</span>
				<textarea 
					className="file-detail-description text-sm" 
					value={description} 
					onChange={(e) => {setDescription(e.target.value)}}
					onBlur={getUnfocus}
				/>
				<span className="text-xs">{description.length} / 5,000</span>
			</div>
		</div>
	</>)
}

function AccessList() {
	return (
		<div className="access-list">
			<p>Me</p>
		</div>
	)
}