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

import { OdroidImageInfo } from './odroid-image';

export function fromAracheDirectoryListing(
	$: any,
	url: string,
	nameFilters: string[],
) {
	const images: OdroidImageInfo[] = [];

	$('body table tbody tr').each((_: any, element: any) => {
		const tdList = $(element).find('td');

		const fileName = $(tdList[1]).text().trim();
		const fileSize = $(tdList[3]).text().trim();

		if (
			hasExcludeExtensions(fileName) ||
			isFilteredByNameFilters(fileName, nameFilters)
		) {
			return;
		}
		if (!fileSize.includes('M') && !fileSize.includes('G')) {
			return;
		}

		images.push(
			new OdroidImageInfo({
				fileName,
				fileSize,
				lastModified: $(tdList[2]).text().trim(),
				downloadUrl: url + fileName,
			}),
		);
	});

	return images;
}

export function fromH5aiDirectoryListing(
	$: any,
	url: string,
	nameFilters: string[],
) {
	const images: OdroidImageInfo[] = [];

	$('body table tbody tr').each((_: any, element: any) => {
		const tdList = $(element).find('td');

		const fileName = $(tdList[1]).text().trim();
		if (
			hasExcludeExtensions(fileName) ||
			isFilteredByNameFilters(fileName, nameFilters)
		) {
			return;
		}

		images.push(
			new OdroidImageInfo({
				fileName,
				fileSize: 'N/A',
				lastModified: $(tdList[2]).text().trim(),
				downloadUrl: url + fileName,
			}),
		);
	});

	return images;
}

export function fromGithubReleases($: any, url: string, nameFilters: string[]) {
	const images: OdroidImageInfo[] = [];

	$('body main details div div .flex-items-center').each(
		(_: any, element: any) => {
			const fileLink = $(element).find('a')?.attr('href') as string;
			const fileSize = $(element).find('small').text().trim();

			if (fileLink === undefined) {
				return;
			}

			const fileLinkSplitted = fileLink.split('/');
			const fileName = fileLinkSplitted[fileLinkSplitted.length - 1];
			if (
				hasExcludeExtensions(fileName) ||
				isFilteredByNameFilters(fileName, nameFilters)
			) {
				return;
			}

			const urlSplitted = url.split('/');
			images.push(
				new OdroidImageInfo({
					fileName,
					fileSize,
					lastModified: 'N/A',
					downloadUrl: urlSplitted[0] + '//' + urlSplitted[2] + fileLink,
				}),
			);
		},
	);

	return images;
}

function isFilteredByNameFilters(fileName: string, nameFilters: string[]) {
	let isFiltered = false;

	nameFilters.forEach((filter) => {
		if ((fileName as string).toLocaleLowerCase().indexOf(filter) === -1) {
			isFiltered = true;
			return;
		}
	});

	return isFiltered;
}

function hasExcludeExtensions(name: string) {
	if (
		name.toLowerCase().indexOf('.img') === -1 ||
		name.toLowerCase().indexOf('.md5') !== -1 ||
		name.toLowerCase().indexOf('.asc') !== -1 ||
		name.toLowerCase().indexOf('.sha') !== -1 ||
		name.toLowerCase().indexOf('.txt') !== -1 ||
		name.toLowerCase().indexOf('.torrent') !== -1
	) {
		return true;
	}

	return false;
}
