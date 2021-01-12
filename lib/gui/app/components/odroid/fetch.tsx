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

import * as webParsing from './website-parse';

export async function odroidImageFetch(url: string, archiveType: string) {
	return new Promise(async (resolve, reject) => {
		const results = await axios.get(url);

		if (results.status !== 200) {
			reject('Failed to load ' + url);
		}

		switch (archiveType) {
			case 'apache':
				resolve(webParsing.fromAracheDirectoryListing(load(results.data), url));
				break;
			case 'h5ai':
				resolve(webParsing.fromH5aiDirectoryListing(load(results.data), url));
				break;
			case 'github':
				resolve(webParsing.fromGithubReleases(load(results.data), url));
				break;
		}
	});
}

export async function getImagesManifest() {
	return new Promise(async (resolve, reject) => {
		const ManifestUrl = 'https://api.awesometic.net/odroid-etcher';
		const Results = await axios.get(ManifestUrl);

		if (Results.status !== 200) {
			reject('Failed to load' + ManifestUrl);
		}

		console.log(Results.data as string);
		resolve(Results.data as string);
	});
}
