/*
 * Copyright 2016 balena.io
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

import CopySvg from '@fortawesome/fontawesome-free/svgs/solid/copy.svg';
import FileSvg from '@fortawesome/fontawesome-free/svgs/solid/file.svg';
import LinkSvg from '@fortawesome/fontawesome-free/svgs/solid/link.svg';
import ExclamationTriangleSvg from '@fortawesome/fontawesome-free/svgs/solid/exclamation-triangle.svg';
import { sourceDestination } from 'etcher-sdk';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import * as _ from 'lodash';
import { GPTPartition, MBRPartition } from 'partitioninfo';
import * as path from 'path';
import * as prettyBytes from 'pretty-bytes';
import * as React from 'react';
import { Async } from 'react-async';
import {
	Flex,
	ButtonProps,
	Modal as SmallModal,
	Txt,
	Step,
	Steps,
	Spinner,
	List,
} from 'rendition';
import styled from 'styled-components';

import * as errors from '../../../../shared/errors';
import * as messages from '../../../../shared/messages';
import * as supportedFormats from '../../../../shared/supported-formats';
import * as selectionState from '../../models/selection-state';
import { observe } from '../../models/store';
import * as analytics from '../../modules/analytics';
import * as exceptionReporter from '../../modules/exception-reporter';
import * as osDialog from '../../os/dialog';
import { replaceWindowsNetworkDriveLetter } from '../../os/windows-network-drives';
import {
	ChangeButton,
	DetailsText,
	Modal,
	Table,
	StepButton,
	StepNameButton,
} from '../../styled-components';
import { colors } from '../../theme';
import { middleEllipsis } from '../../utils/middle-ellipsis';
import { SVGIcon } from '../svg-icon/svg-icon';
// import { createFullTextSearchFilter } from 'rendition/dist/components/Filters/SchemaSieve';

import ImageSvg from '../../../assets/image.svg';
import SrcSvg from '../../../assets/src.svg';
import { DriveSelector } from '../drive-selector/drive-selector';
import { DrivelistDrive } from '../../../../shared/drive-constraints';

import { odroidImageFetch, getImagesManifest } from '../odroid/fetch';
import { OdroidImageInfo } from '../odroid/odroid-image';
import { OdroidImageStepInfo } from '../odroid/odroid-image-step';
import { SelectedOptions } from '../odroid/selected-options';
import { NameFilters } from '../odroid/name-filters';

// TODO move these styles to rendition
const ModalText = styled.p`
	a {
		color: rgb(0, 174, 239);

		&:hover {
			color: rgb(0, 139, 191);
		}
	}
`;

const isURL = (imagePath: string) =>
	imagePath.startsWith('https://') || imagePath.startsWith('http://');

function getState() {
	const image = selectionState.getImage();
	return {
		hasImage: selectionState.hasImage(),
		imageName: image?.name,
		imageSize: image?.size,
	};
}

function isString(value: any): value is string {
	return typeof value === 'string';
}

const OdroidImageSelector = ({
	done,
	cancel,
}: {
	done: (imageURL: string) => void;
	cancel: () => void;
}) => {
	const [imageURL, setImageURL] = React.useState('');
	const [loading, setLoading] = React.useState(false);

	const OdroidImageStepTable = styled(({ refFn, ...props }) => {
		return <Table<OdroidImageStepInfo> ref={refFn} {...props} />;
	})`
		border-bottom: none;
		table-layout: fixed;

		[data-display='table-body'] > [data-display='table-row'] {
			&:nth-of-type(even):hover {
				background: initial;
				background-color: #e8f5fc;
			}
		}
	`;

	const OdroidImagesTable = styled(({ refFn, ...props }) => {
		return <Table<OdroidImageInfo> ref={refFn} {...props} />;
	})`
		border-bottom: none;
		table-layout: fixed;

		[data-display='table-head'],
		[data-display='table-body'] {
			> [data-display='table-row'] {
				&:nth-of-type(even):hover {
					background: initial;
					background-color: #e8f5fc;
				}
			}

			> [data-display='table-row'] > [data-display='table-cell'] {
				&:nth-child(1) {
					width: 74% !important;
					overflow: auto;
				}

				&:nth-child(2) {
					width: 8%;
				}
			}
		}
	`;

	let isComplete = [false, false, false, false];
	const currentActiveStepIndex = () => {
		let index = 0;

		isComplete.forEach((element) => {
			if (element) {
				index++;
			}
		});

		return index;
	};

	interface ImageSelectModalProps {
		addressesJsonObject: any;
	}

	interface ImageSelectModalState {
		board: boolean;
		distributor: boolean;
		os: boolean;
		image: boolean;
	}

	const ShowContents = (props: {
		addressesJsonObject: any;
		setModalState: (nextState: ImageSelectModalState) => void;
	}) => {
		let contents = null;

		switch (currentActiveStepIndex()) {
			case 0: {
				const toBoardTableData = (boardName: string) => {
					return {
						board_name: boardName,
					};
				};
				const boardNames = Array();
				const boardNameEntries = Object.entries(
					props.addressesJsonObject['Board'],
				);

				boardNameEntries.forEach((element) => {
					boardNames.push(element[1]);
				});

				contents = (
					<OdroidImageStepTable
						columns={odroidBoardsTableColumns}
						data={boardNames.map((boardName) => toBoardTableData(boardName))}
						rowKey="board_name"
						onRowClick={(row: any) => {
							console.log('Clicked: ' + row['board_name']);
							SelectedOptions.selectedByUser.board = row['board_name'];
							props.setModalState({
								board: true,
								distributor: true,
								os: false,
								image: false,
							});
						}}
					/>
				);
				break;
			}
			case 1: {
				const toDistributorTableData = (distributorName: string) => {
					return {
						distributor_name: distributorName,
					};
				};
				const DistributorNameEntries = Object.entries(
					props.addressesJsonObject['Distributor'],
				);
				const distributorNames = Array();

				DistributorNameEntries.forEach((element) => {
					distributorNames.push(element[0]);
				});

				contents = (
					<OdroidImageStepTable
						columns={odroidDistributorTableColumns}
						data={distributorNames.map((distributorName) =>
							toDistributorTableData(distributorName),
						)}
						rowKey="distributor_name"
						onRowClick={(row: any) => {
							console.log('Clicked: ' + row['distributor_name']);
							SelectedOptions.selectedByUser.distributor =
								row['distributor_name'];
							props.setModalState({
								board: true,
								distributor: true,
								os: true,
								image: false,
							});
						}}
					/>
				);
				break;
			}
			case 2: {
				const toImageTableData = (imageName: string) => {
					return {
						image_name: imageName,
					};
				};

				const addrJsonWithSelectedDist =
					props.addressesJsonObject['Distributor'][
						SelectedOptions.selectedByUser.distributor
					];

				if (
					!(SelectedOptions.selectedByUser.board in addrJsonWithSelectedDist)
				) {
					return <p>N/A</p>;
				}

				const ImageNameEntries = Object.entries(
					addrJsonWithSelectedDist[SelectedOptions.selectedByUser.board],
				);
				const imageNames = Array();

				ImageNameEntries.forEach((element) => {
					imageNames.push(element[0]);
				});

				contents = (
					<OdroidImageStepTable
						columns={odroidImageTableColumns}
						data={imageNames.map((imageName) => toImageTableData(imageName))}
						rowKey="image_name"
						onRowClick={(row: any) => {
							console.log('Clicked: ' + row['image_name']);
							SelectedOptions.selectedByUser.image = row['image_name'];
							props.setModalState({
								board: true,
								distributor: true,
								os: true,
								image: true,
							});
						}}
					/>
				);
				break;
			}
			case 3: {
				const addrJsonWithSelectedDist =
					props.addressesJsonObject['Distributor'][
						SelectedOptions.selectedByUser.distributor
					];

				const selectedImageEntry =
					addrJsonWithSelectedDist[SelectedOptions.selectedByUser.board][
						SelectedOptions.selectedByUser.image
					];

				let targetUrl = '';
				targetUrl += addrJsonWithSelectedDist['baseUrl'];
				NameFilters.reset();

				if (typeof selectedImageEntry !== 'string') {
					targetUrl += selectedImageEntry['url'];
					NameFilters.nameFilters.hasToContain = selectedImageEntry[
						'nameFilters'
					].split(',');
				} else {
					targetUrl += selectedImageEntry;
				}

				const archiveType = addrJsonWithSelectedDist['archiveType'];

				contents = (
					<Async
						promiseFn={async () => odroidImageFetch(targetUrl, archiveType)}
					>
						{({ data, error, isLoading }) => {
							if (isLoading) {
								return (
									<Flex
										flexDirection="column"
										justifyContent="center"
										alignItems="center"
										height="100%"
									>
										<Spinner label="Loading..." emphasized />
									</Flex>
								);
							}

							if (error) {
								return { error };
							}

							if (data) {
								return (
									<OdroidImagesTable
										columns={odroidFilesTableColumns}
										data={(data as OdroidImageInfo[]).map((imageInfo) =>
											imageInfo.toTableData(),
										)}
										rowKey="download_url"
										onRowClick={(row: any) => {
											console.log(
												'Clicked image file name: ' + row['file_name'],
											);
											console.log('Download URL: ' + row['download_url']);
											setImageURL(row['download_url']);
										}}
									/>
								);
							}
						}}
					</Async>
				);
				break;
			}
		}

		return contents;
	};

	const StepLabels = ['Board', 'Distributor', 'OS Image', 'Files'];

	const GetStep = (index: number) => {
		return (
			<Step key={index} status={isComplete[index] ? 'completed' : 'pending'}>
				{StepLabels[index]}
			</Step>
		);
	};

	const OrderedSteps = ({ ...props }) => {
		return (
			<Steps
				ordered
				activeStepIndex={currentActiveStepIndex()}
				pb={2}
				{...props}
			>
				{StepLabels.map((_null, index) => GetStep(index))}
			</Steps>
		);
	};

	const odroidBoardsTableColumns: any = [
		{
			field: 'board_name',
			label: 'Board Name',
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidDistributorTableColumns: any = [
		{
			field: 'distributor_name',
			label: 'Distributor Name',
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidImageTableColumns: any = [
		{
			field: 'image_name',
			label: 'OS Image Name',
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidFilesTableColumns: any = [
		{
			field: 'file_name',
			label: 'Name',
			render: (value: string) => <code>{value}</code>,
		},
		{
			field: 'file_size',
			label: 'Size',
			render: (value: string) => <span>{value}</span>,
		},
		{
			field: 'last_modified',
			label: 'Last Modified',
			render: (value: string) => <span>{value}</span>,
		},
	];

	class ImageSelectModal extends React.Component<
		ImageSelectModalProps,
		ImageSelectModalState
	> {
		constructor(props: ImageSelectModalProps) {
			super(props);

			this.state = {
				board: true,
				distributor: false,
				os: false,
				image: false,
			};

			this.update = this.update.bind(this);
		}

		public shouldComponentUpdate(
			_nextProps: {},
			nextState: ImageSelectModalState,
		) {
			if (nextState['image']) {
				isComplete = [true, true, true, false];
			} else if (nextState['os']) {
				isComplete = [true, true, false, false];
			} else if (nextState['distributor']) {
				isComplete = [true, false, false, false];
			} else {
				console.log('Something goes wrong, ImageSelectModal will not render.');
				return false;
			}

			console.log(isComplete);

			return true;
		}

		private update(nextState: ImageSelectModalState) {
			this.setState(nextState);
		}

		public render() {
			let contents = null;

			if (loading) {
				contents = (
					<Flex
						flexDirection="column"
						justifyContent="center"
						alignItems="center"
						height="100%"
					>
						<Spinner
							label="Downloading... Please wait for a moment..."
							emphasized
						/>
					</Flex>
				);
			} else {
				if (!imageURL) {
					contents = (
						<>
							<Flex
								flexDirection="column"
								justifyContent="flex-end"
								alignItems="center"
								width="100%"
								height="15%"
							>
								<OrderedSteps bordered={false} />
							</Flex>
							<Flex
								flexDirection="column"
								alignItems="center"
								width="100%"
								height="85%"
							>
								<ShowContents
									addressesJsonObject={this.props.addressesJsonObject}
									setModalState={this.update}
								/>
							</Flex>
						</>
					);
				} else {
					contents = (
						<>
							<Flex
								flexDirection="column"
								justifyContent="center"
								alignItems="center"
								height="100%"
							>
								<>
									<Txt.p align="start" style={{ width: '100%' }}>
										<Txt>Here're the selected options.</Txt>
										<List>
											<Txt>
												<b>Board</b>: {SelectedOptions.selectedByUser.board}
											</Txt>
											<Txt>
												<b>Distributor</b>:{' '}
												{SelectedOptions.selectedByUser.distributor}
											</Txt>
											<Txt>
												<b>OS</b>: {SelectedOptions.selectedByUser.image}
											</Txt>
											<Txt>
												<b>The file will be downloaded from this link</b>:
												<Txt>{imageURL}</Txt>
											</Txt>
										</List>
									</Txt.p>
									<Txt.p align="center">
										<Txt>
											If all options are selected well, click <b>OK</b> button
											to start download.
										</Txt>
										<Txt>
											If not, click <b>Cancel</b> button to go back to the main
											screen then follow the steps again.
										</Txt>
									</Txt.p>
								</>
							</Flex>
						</>
					);
				}
			}
			return contents;
		}
	}

	return (
		<Modal
			titleElement={
				<Flex alignItems="baseline" mb={18}>
					<Txt fontSize={24} align="left">
						Odroid images
					</Txt>
					<Txt
						fontSize={11}
						ml={12}
						color="#5b82a7"
						style={{ fontWeight: 600 }}
					>
						Select an image file that you want to flash to your SD card
					</Txt>
				</Flex>
			}
			titleDetails={<Txt fontSize={11}>Select an image file</Txt>}
			cancel={cancel}
			primaryButtonProps={{
				disabled: loading || !imageURL,
			}}
			action="OK"
			done={async () => {
				setLoading(true);
				await done(imageURL);
			}}
		>
			<Flex flexDirection="column" width="100%" height="100%">
				<Async promiseFn={async () => getImagesManifest()}>
					{({ data, error, isLoading }) => {
						if (isLoading) {
							return (
								<Flex
									flexDirection="column"
									justifyContent="center"
									alignItems="center"
									height="100%"
								>
									<Spinner label="Loading..." emphasized />
								</Flex>
							);
						}

						if (error) {
							return (
								<Flex
									flexDirection="column"
									justifyContent="center"
									alignItems="center"
									height="100%"
								>
									<Txt.p bold>
										Failed to fetch the image list. Please wait for a moment
										until the server is recovered.
									</Txt.p>
								</Flex>
							);
						}

						if (data) {
							return <ImageSelectModal addressesJsonObject={data} />;
						}
					}}
				</Async>
			</Flex>
		</Modal>
	);
};

interface Flow {
	icon?: JSX.Element;
	onClick: (evt: React.MouseEvent) => void;
	label: string;
}

const FlowSelector = styled(
	({ flow, ...props }: { flow: Flow } & ButtonProps) => (
		<StepButton
			plain={!props.primary}
			primary={props.primary}
			onClick={(evt: React.MouseEvent<Element, MouseEvent>) =>
				flow.onClick(evt)
			}
			icon={flow.icon}
			{...props}
		>
			{flow.label}
		</StepButton>
	),
)`
	border-radius: 24px;
	color: rgba(255, 255, 255, 0.7);

	:enabled:focus,
	:enabled:focus svg {
		color: ${colors.primary.foreground} !important;
	}

	:enabled:hover {
		background-color: ${colors.primary.background};
		color: ${colors.primary.foreground};
		font-weight: 600;

		svg {
			color: ${colors.primary.foreground}!important;
		}
	}
`;

export type Source =
	| typeof sourceDestination.File
	| typeof sourceDestination.BlockDevice
	| typeof sourceDestination.Http;

export interface SourceMetadata extends sourceDestination.Metadata {
	hasMBR?: boolean;
	partitions?: MBRPartition[] | GPTPartition[];
	path: string;
	displayName: string;
	description: string;
	SourceType: Source;
	drive?: DrivelistDrive;
	extension?: string;
	archiveExtension?: string;
}

interface SourceSelectorProps {
	flashing: boolean;
}

interface SourceSelectorState {
	hasImage: boolean;
	imageName?: string;
	imageSize?: number;
	warning: { message: string; title: string | null } | null;
	showImageDetails: boolean;
	showOdroidImageSelector: boolean;
	showDriveSelector: boolean;
	defaultFlowActive: boolean;
	imageSelectorOpen: boolean;
}

export class SourceSelector extends React.Component<
	SourceSelectorProps,
	SourceSelectorState
> {
	private unsubscribe: (() => void) | undefined;

	constructor(props: SourceSelectorProps) {
		super(props);
		this.state = {
			...getState(),
			warning: null,
			showImageDetails: false,
			showOdroidImageSelector: false,
			showDriveSelector: false,
			defaultFlowActive: true,
			imageSelectorOpen: false,
		};

		// Bind `this` since it's used in an event's callback
		this.onSelectImage = this.onSelectImage.bind(this);
	}

	public componentDidMount() {
		this.unsubscribe = observe(() => {
			this.setState(getState());
		});
		ipcRenderer.on('select-image', this.onSelectImage);
		ipcRenderer.send('source-selector-ready');
	}

	public componentWillUnmount() {
		this.unsubscribe?.();
		ipcRenderer.removeListener('select-image', this.onSelectImage);
	}

	private async onSelectImage(_event: IpcRendererEvent, imagePath: string) {
		await this.selectSource(
			imagePath,
			isURL(imagePath) ? sourceDestination.Http : sourceDestination.File,
		).promise;
	}

	private async createSource(selected: string, SourceType: Source) {
		try {
			selected = await replaceWindowsNetworkDriveLetter(selected);
		} catch (error) {
			analytics.logException(error);
		}

		if (SourceType === sourceDestination.File) {
			return new sourceDestination.File({
				path: selected,
			});
		}
		return new sourceDestination.Http({ url: selected });
	}

	private reselectSource() {
		analytics.logEvent('Reselect image', {
			previousImage: selectionState.getImage(),
		});

		selectionState.deselectImage();
	}

	private selectSource(
		selected: string | DrivelistDrive,
		SourceType: Source,
	): { promise: Promise<void>; cancel: () => void } {
		let cancelled = false;
		return {
			cancel: () => {
				cancelled = true;
			},
			promise: (async () => {
				const sourcePath = isString(selected) ? selected : selected.device;
				let source;
				let metadata: SourceMetadata | undefined;
				if (isString(selected)) {
					if (SourceType === sourceDestination.Http && !isURL(selected)) {
						this.handleError(
							'Unsupported protocol',
							selected,
							messages.error.unsupportedProtocol(),
						);
						return;
					}

					if (supportedFormats.looksLikeWindowsImage(selected)) {
						analytics.logEvent('Possibly Windows image', { image: selected });
						this.setState({
							warning: {
								message: messages.warning.looksLikeWindowsImage(),
								title: 'Possible Windows image detected',
							},
						});
					}
					source = await this.createSource(selected, SourceType);

					if (cancelled) {
						return;
					}

					try {
						const innerSource = await source.getInnerSource();
						if (cancelled) {
							return;
						}
						metadata = await this.getMetadata(innerSource, selected);
						if (cancelled) {
							return;
						}
						metadata.SourceType = SourceType;

						if (!metadata.hasMBR) {
							analytics.logEvent('Missing partition table', { metadata });
							this.setState({
								warning: {
									message: messages.warning.missingPartitionTable(),
									title: 'Missing partition table',
								},
							});
						}
					} catch (error) {
						this.handleError(
							'Error opening source',
							sourcePath,
							messages.error.openSource(sourcePath, error.message),
							error,
						);
					} finally {
						try {
							await source.close();
						} catch (error) {
							// Noop
						}
					}
				} else {
					if (selected.partitionTableType === null) {
						analytics.logEvent('Missing partition table', { selected });
						this.setState({
							warning: {
								message: messages.warning.driveMissingPartitionTable(),
								title: 'Missing partition table',
							},
						});
					}
					metadata = {
						path: selected.device,
						displayName: selected.displayName,
						description: selected.displayName,
						size: selected.size as SourceMetadata['size'],
						SourceType: sourceDestination.BlockDevice,
						drive: selected,
					};
				}

				if (metadata !== undefined) {
					selectionState.selectSource(metadata);
					analytics.logEvent('Select image', {
						// An easy way so we can quickly identify if we're making use of
						// certain features without printing pages of text to DevTools.
						image: {
							...metadata,
							logo: Boolean(metadata.logo),
							blockMap: Boolean(metadata.blockMap),
						},
					});
				}
			})(),
		};
	}

	private handleError(
		title: string,
		sourcePath: string,
		description: string,
		error?: Error,
	) {
		const imageError = errors.createUserError({
			title,
			description,
		});
		osDialog.showError(imageError);
		if (error) {
			analytics.logException(error);
			return;
		}
		analytics.logEvent(title, { path: sourcePath });
	}

	private async getMetadata(
		source: sourceDestination.SourceDestination,
		selected: string | DrivelistDrive,
	) {
		const metadata = (await source.getMetadata()) as SourceMetadata;
		const partitionTable = await source.getPartitionTable();
		if (partitionTable) {
			metadata.hasMBR = true;
			metadata.partitions = partitionTable.partitions;
		} else {
			metadata.hasMBR = false;
		}
		if (isString(selected)) {
			metadata.extension = path.extname(selected).slice(1);
			metadata.path = selected;
		}
		return metadata;
	}

	private async openImageSelector() {
		analytics.logEvent('Open image selector');
		this.setState({ imageSelectorOpen: true });

		try {
			const imagePath = await osDialog.selectImage();
			// Avoid analytics and selection state changes
			// if no file was resolved from the dialog.
			if (!imagePath) {
				analytics.logEvent('Image selector closed');
				return;
			}
			await this.selectSource(imagePath, sourceDestination.File).promise;
		} catch (error) {
			exceptionReporter.report(error);
		} finally {
			this.setState({ imageSelectorOpen: false });
		}
	}

	private async onDrop(event: React.DragEvent<HTMLDivElement>) {
		const [file] = event.dataTransfer.files;
		if (file) {
			await this.selectSource(file.path, sourceDestination.File).promise;
		}
	}

	private openOdroidImageSelector() {
		analytics.logEvent('Open Odroid image URL selector');

		this.setState({
			showOdroidImageSelector: true,
		});
	}

	private openDriveSelector() {
		analytics.logEvent('Open drive selector');

		this.setState({
			showDriveSelector: true,
		});
	}

	private onDragOver(event: React.DragEvent<HTMLDivElement>) {
		// Needed to get onDrop events on div elements
		event.preventDefault();
	}

	private onDragEnter(event: React.DragEvent<HTMLDivElement>) {
		// Needed to get onDrop events on div elements
		event.preventDefault();
	}

	private showSelectedImageDetails() {
		analytics.logEvent('Show selected image tooltip', {
			imagePath: selectionState.getImage()?.path,
		});

		this.setState({
			showImageDetails: true,
		});
	}

	private setDefaultFlowActive(defaultFlowActive: boolean) {
		this.setState({ defaultFlowActive });
	}

	// TODO add a visual change when dragging a file over the selector
	public render() {
		const { flashing } = this.props;
		const {
			showImageDetails,
			showOdroidImageSelector,
			showDriveSelector,
		} = this.state;
		const selectionImage = selectionState.getImage();
		let image: SourceMetadata | DrivelistDrive =
			selectionImage !== undefined ? selectionImage : ({} as SourceMetadata);

		image = image.drive ?? image;

		let cancelURLSelection = () => {
			// noop
		};
		image.name = image.description || image.name;
		const imagePath = image.path || image.displayName || '';
		const imageBasename = path.basename(imagePath);
		const imageName = image.name || '';
		const imageSize = image.size;
		const imageLogo = image.logo || '';

		return (
			<>
				<Flex
					flexDirection="column"
					alignItems="center"
					onDrop={(evt: React.DragEvent<HTMLDivElement>) => this.onDrop(evt)}
					onDragEnter={(evt: React.DragEvent<HTMLDivElement>) =>
						this.onDragEnter(evt)
					}
					onDragOver={(evt: React.DragEvent<HTMLDivElement>) =>
						this.onDragOver(evt)
					}
				>
					<SVGIcon
						contents={imageLogo}
						fallback={ImageSvg}
						style={{
							marginBottom: 30,
						}}
					/>

					{selectionImage !== undefined ? (
						<>
							<StepNameButton
								plain
								onClick={() => this.showSelectedImageDetails()}
								tooltip={imageName || imageBasename}
							>
								{middleEllipsis(imageName || imageBasename, 20)}
							</StepNameButton>
							{!flashing && (
								<ChangeButton
									plain
									mb={14}
									onClick={() => this.reselectSource()}
								>
									Remove
								</ChangeButton>
							)}
							{!_.isNil(imageSize) && (
								<DetailsText>{prettyBytes(imageSize)}</DetailsText>
							)}
						</>
					) : (
						<>
							<FlowSelector
								disabled={this.state.imageSelectorOpen}
								primary={this.state.defaultFlowActive}
								key="Flash from file"
								flow={{
									onClick: () => this.openImageSelector(),
									label: 'Flash from file',
									icon: <FileSvg height="1em" fill="currentColor" />,
								}}
								onMouseEnter={() => this.setDefaultFlowActive(false)}
								onMouseLeave={() => this.setDefaultFlowActive(true)}
							/>
							<FlowSelector
								key="Flash Odroid image"
								flow={{
									onClick: () => this.openOdroidImageSelector(),
									label: 'Flash Odroid image',
									icon: <LinkSvg height="1em" fill="currentColor" />,
								}}
								onMouseEnter={() => this.setDefaultFlowActive(false)}
								onMouseLeave={() => this.setDefaultFlowActive(true)}
							/>
							<FlowSelector
								key="Clone drive"
								flow={{
									onClick: () => this.openDriveSelector(),
									label: 'Clone drive',
									icon: <CopySvg height="1em" fill="currentColor" />,
								}}
								onMouseEnter={() => this.setDefaultFlowActive(false)}
								onMouseLeave={() => this.setDefaultFlowActive(true)}
							/>
						</>
					)}
				</Flex>

				{this.state.warning != null && (
					<SmallModal
						titleElement={
							<span>
								<ExclamationTriangleSvg fill="#fca321" height="1em" />{' '}
								<span>{this.state.warning.title}</span>
							</span>
						}
						action="Continue"
						cancel={() => {
							this.setState({ warning: null });
							this.reselectSource();
						}}
						done={() => {
							this.setState({ warning: null });
						}}
						primaryButtonProps={{ warning: true, primary: false }}
					>
						<ModalText
							dangerouslySetInnerHTML={{ __html: this.state.warning.message }}
						/>
					</SmallModal>
				)}

				{showImageDetails && (
					<SmallModal
						title="Image"
						done={() => {
							this.setState({ showImageDetails: false });
						}}
					>
						<Txt.p>
							<Txt.span bold>Name: </Txt.span>
							<Txt.span>{imageName || imageBasename}</Txt.span>
						</Txt.p>
						<Txt.p>
							<Txt.span bold>Path: </Txt.span>
							<Txt.span>{imagePath}</Txt.span>
						</Txt.p>
					</SmallModal>
				)}

				{showOdroidImageSelector && (
					<OdroidImageSelector
						cancel={() => {
							cancelURLSelection();
							this.setState({
								showOdroidImageSelector: false,
							});
						}}
						done={async (imageURL: string) => {
							// Avoid analytics and selection state changes
							// if no file was resolved from the dialog.
							if (!imageURL) {
								analytics.logEvent('URL selector closed');
							} else {
								let promise;
								({ promise, cancel: cancelURLSelection } = this.selectSource(
									imageURL,
									sourceDestination.Http,
								));
								await promise;
							}
							this.setState({
								showOdroidImageSelector: false,
							});
						}}
					/>
				)}

				{showDriveSelector && (
					<DriveSelector
						write={false}
						multipleSelection={false}
						titleLabel="Select source"
						emptyListLabel="Plug a source drive"
						emptyListIcon={<SrcSvg width="40px" />}
						cancel={() => {
							this.setState({
								showDriveSelector: false,
							});
						}}
						done={async (drives: DrivelistDrive[]) => {
							if (drives.length) {
								await this.selectSource(
									drives[0],
									sourceDestination.BlockDevice,
								);
							}
							this.setState({
								showDriveSelector: false,
							});
						}}
					/>
				)}
			</>
		);
	}
}
