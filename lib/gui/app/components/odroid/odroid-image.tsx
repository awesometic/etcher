/*
 * Copyright 2021 Deokgyu Yang <secugyu@gmail.com>
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

interface IOdroidImageInfo {
	fileName: string;
	fileSize: string;
	lastModified: string;
	downloadUrl: string;
}

export class OdroidImageInfo {
	private _fileName: string;
	private _fileSize: string;
	private _lastModified: string;
	private _downloadUrl: string;

	constructor(
		obj: IOdroidImageInfo = {
			fileName: '',
			fileSize: '',
			lastModified: '',
			downloadUrl: '',
		},
	) {
		this._fileName = obj.fileName;
		this._fileSize = obj.fileSize;
		this._lastModified = obj.lastModified;
		this._downloadUrl = obj.downloadUrl;
	}

	public getFileName(): string {
		return this._fileName;
	}

	public getDownloadUrl(): string {
		return this._downloadUrl;
	}

	public toTableData() {
		return {
			file_name: this._fileName,
			file_size: this._fileSize,
			last_modified: this._lastModified,
			download_url: this._downloadUrl,
		};
	}

	public toString(): string {
		return (
			'{' +
			'"file_name":' +
			'"' +
			this._fileName +
			'",' +
			'"file_size":' +
			'"' +
			this._fileSize +
			'",' +
			'"last_modified":' +
			'"' +
			this._lastModified +
			'",' +
			'"download_url":' +
			'"' +
			this._downloadUrl +
			'",' +
			'},'
		);
	}
}
