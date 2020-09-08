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
	['US_WEST', 'https://odroid.in/ubuntu_20.04lts/'],
	['EU', 'http://de.eu.odroid.in/ubuntu_20.04lts/'],
]);

export const ImageNests = new Map<string, Map<string, string>>([
	[
		'XU3/XU4/MC1/HC1/HC2',
		new Map([['Ubuntu 20.04 LTS', 'XU3_XU4_MC1_HC1_HC2/']]),
	],
	['C0/C1/C1+', new Map([['Ubuntu 20.04 LTS', 'c0_c1/']])],
	['C2', new Map([['Ubuntu 20.04 LTS', 'c2/']])],
	['N2/N2+', new Map([['Ubuntu 20.04 LTS', 'n2/']])],
	['C4', new Map([['Ubuntu 20.04 LTS', 'c4/']])],
]);
