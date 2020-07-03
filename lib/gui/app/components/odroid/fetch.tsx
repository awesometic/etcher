import axios from 'axios';
import { load } from 'cheerio';

const baseUrl = 'https://odroid.in/';
const targetUrl = baseUrl + 'ubuntu_20.04lts/c4/';

interface IOdroidImageInfo {
	name: string;
	fileSize: string;
	lastModified: string;
	url: string;
}

class OdroidImageInfo {
	private _name: string;
	private _fileSize: string;
	private _lastModified: string;
	private _url: string;

	constructor(
		obj: IOdroidImageInfo = {
			name: '',
			fileSize: '',
			lastModified: '',
			url: '',
		},
	) {
		this._name = obj.name;
		this._fileSize = obj.fileSize;
		this._lastModified = obj.lastModified;
		this._url = obj.url;
	}

	public toString(): string {
		return (
			'' +
			'\nname:\t' +
			this._name +
			'\nfileSize:\t' +
			this._fileSize +
			'\nlastModified:\t' +
			this._lastModified +
			'\nurl:\t' +
			this._url
		);
	}
}

async function odroidImagefetch(url = targetUrl): Promise<any[]> {
	return new Promise(async (resolve, reject) => {
		const results = await axios.get(url);
		let images: OdroidImageInfo[] = [];

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
					name: fileName,
					lastModified: $(tdList[2]).text().trim(),
					fileSize: fileSize,
					url: url + fileName,
				}),
			);
		});

		resolve(images);
	});
}

export function test_fetch(): void {
	odroidImagefetch().then((images) => {
		console.log(images.toString());
	});
}
