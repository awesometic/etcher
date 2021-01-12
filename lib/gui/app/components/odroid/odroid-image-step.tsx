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

interface IOdroidImageStepInfo {
	optionName: string;
}

export class OdroidImageStepInfo {
	private _optionName: string;

	constructor(
		obj: IOdroidImageStepInfo = {
			optionName: '',
		},
	) {
		this._optionName = obj.optionName;
	}

	public getOptionName(): string {
		return this._optionName;
	}

	public toTableData() {
		return {
			option_name: this._optionName,
		};
	}

	public toString(): string {
		return '{' + '"option_name":' + '"' + this._optionName + '",' + '},';
	}
}
