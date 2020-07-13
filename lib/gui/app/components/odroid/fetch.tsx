import axios from 'axios';
import { load } from 'cheerio';

const baseUrl = 'https://odroid.in/';
const targetUrl = baseUrl + 'ubuntu_20.04lts/c4/';

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

export async function odroidImageFetch(url = targetUrl) {
	return new Promise(async (resolve, reject) => {
		const results = await axios.get(url);
		const images: OdroidImageInfo[] = [];

		if (results.status !== 200) {
			reject('Failed to load ' + url);
		}

		const $ = load(results.data);

		$('body table tbody tr').each((_, element) => {
			const tdList = $(element).find('td');

			const fileName = $(tdList[1]).text().trim();
			const fileSize = $(tdList[3]).text().trim();

			if (!fileSize.includes('M') && !fileSize.includes('G')) return;

			images.push(
				new OdroidImageInfo({
					fileName,
					fileSize,
					lastModified: $(tdList[2]).text().trim(),
					downloadUrl: url + fileName,
				}),
			);
		});

		resolve(images);
	});
}
