/*
 * Copyright 2020-2021 Deokgyu Yang <secugyu@gmail.com>
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

import axios from 'axios';
import { load } from 'cheerio';

import * as webParser from './webpage-parser';

export async function odroidImageFetch(url: string, archiveType: string) {
	return new Promise(async (resolve, reject) => {
		const results = await axios.get(url);

		if (results.status !== 200) {
			reject('Failed to load ' + url);
		}

		switch (archiveType) {
			case 'apache':
				resolve(webParser.fromAracheDirectoryListing(load(results.data), url));
				break;
			case 'h5ai':
				resolve(webParser.fromH5aiDirectoryListing(load(results.data), url));
				break;
			case 'github':
				resolve(webParser.fromGithubReleases(load(results.data), url));
				break;
		}
	});
}

export async function getImagesManifest() {
	return new Promise(async (resolve, reject) => {
		const ManifestUrl = 'https://api.awesometic.net/odroid-etcher';

		if (navigator.onLine) {
			await axios
				.get(ManifestUrl, {
					timeout: 5000,
				})
				.then((res) => {
					if (res.status === 200) {
						console.log(res.data as string);
						resolve(res.data as string);
					} else {
						reject('Abnormal status code: ' + res.status);
					}
				})
				.catch((err) => {
					reject('Server is not available: ' + err.message);
				});
		} else {
			reject('No internet connection');
		}
	});
}
