/*
 * Copyright 2020 Deokgyu Yang <secugyu@gmail.com>
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

export const MirrorServers = new Map<string, string>([
	['KOREA', 'https://dn.odroid.com/'],
	['US_WEST', 'https://odroid.in/mirror/dn.odroid.com/'],
	['EU', 'https://de.eu.odroid.in/mirror/dn.odroid.com/'],
]);

export const ImageNests = new Map<string, Map<string, string>>([
	['XU3_XU4', new Map([['', '']])],
	['C0_C1', new Map([['', '']])],
	['C2', new Map([['', '']])],
	['N2', new Map([['', '']])],
	[
		'C4',
		new Map([
			['UBUNTU', 'S905X3/ODROID-C4/Ubuntu/'],
			['ANDROID_PIE_64', 'S905X3/ODROID-C4/Android/pie/64/'],
			['ANDROID_PIE_32', 'S905X3/ODROID-C4/Android/pie/32/'],
		]),
	],
]);
