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

import FileSvg from '@fortawesome/fontawesome-free/svgs/solid/file.svg';
import LinkSvg from '@fortawesome/fontawesome-free/svgs/solid/link.svg';
import ExclamationTriangleSvg from '@fortawesome/fontawesome-free/svgs/solid/exclamation-triangle.svg';
import { sourceDestination } from 'etcher-sdk';
import { ipcRenderer, IpcRendererEvent } from 'electron';
import * as _ from 'lodash';
import { GPTPartition, MBRPartition } from 'partitioninfo';
import * as path from 'path';
import * as React from 'react';
import { Async } from 'react-async';
import {
	Flex,
	ButtonProps,
	Modal as SmallModal,
	Txt,
	Step,
	Steps,
	Table,
	Spinner,
} from 'rendition';
import styled from 'styled-components';

import * as errors from '../../../../shared/errors';
import * as messages from '../../../../shared/messages';
import * as supportedFormats from '../../../../shared/supported-formats';
import * as shared from '../../../../shared/units';
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
	StepButton,
	StepNameButton,
} from '../../styled-components';
import { colors } from '../../theme';
import { middleEllipsis } from '../../utils/middle-ellipsis';
import { SVGIcon } from '../svg-icon/svg-icon';
// import { createFullTextSearchFilter } from 'rendition/dist/components/Filters/SchemaSieve';

import ImageSvg from '../../../assets/image.svg';

import { OdroidImageInfo, odroidImageFetch } from '../odroid/fetch';
import { MirrorServers, ImageNests } from '../odroid/addresses';
// TODO move these styles to rendition
const ModalText = styled.p`
	a {
		color: rgb(0, 174, 239);

		&:hover {
			color: rgb(0, 139, 191);
		}
	}
`;

function getState() {
	return {
		hasImage: selectionState.hasImage(),
		imageName: selectionState.getImageName(),
		imageSize: selectionState.getImageSize(),
	};
}

const OdroidImageSelector = ({
	done,
	cancel,
}: {
	done: (imageURL: string) => void;
	cancel: () => void;
}) => {
	const [imageURL, setImageURL] = React.useState('');

	// If imageURL variable has more than 7 letters, "http://".
	const isImageUrlSet = () => {
		return imageURL.length > 7;
	};

	const OdroidImagesTable = styled(({ refFn, ...props }) => {
		return (
			<div>
				<Table<OdroidImageInfo> ref={refFn} {...props} />
			</div>
		);
	})`
		[data-display='table-head'] [data-display='table-cell'] {
			position: sticky;
			top: 0;
			background-color: ${(props) => props.theme.colors.quartenary.light};
			font-color: grey;
		}

		[data-display='table-cell']:first-child {
			padding-left: 15px;
			width: 460px;
		}

		[data-display='table-cell']:last-child {
			width: 150px;
		}

		&& [data-display='table-row'] > [data-display='table-cell'] {
			padding: 6px 8px;
			color: #2a506f;
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

	interface ImageSelectModalState {
		board: boolean;
		os: boolean;
		mirrorServer: boolean;
		image: boolean;
	}

	const selectedByUser = {
		board: '',
		os: '',
		mirrorServer: '',
	};

	const ShowContents = (props: {
		setModalState: (nextState: ImageSelectModalState) => void;
	}) => {
		let contents = null;
		switch (currentActiveStepIndex()) {
			case 0: {
				const boardNames = Array.from(ImageNests.keys());
				const toBoardTableData = (boardName: string) => {
					return {
						board_name: boardName,
					};
				};

				contents = (
					<>
						<OdroidImagesTable
							columns={odroidBoardsTableColumns}
							data={boardNames.map((boardName) => toBoardTableData(boardName))}
							rowKey="board_name"
							onRowClick={(row: any) => {
								console.log('Clicked: ' + row['board_name']);
								selectedByUser['board'] = row['board_name'];
								props.setModalState({
									board: true,
									os: true,
									mirrorServer: false,
									image: false,
								});
							}}
						/>
					</>
				);
				break;
			}
			case 1: {
				const OsByBoard = ImageNests.get(selectedByUser['board']) as Map<
					string,
					string
				>;
				const OsNames = Array.from(OsByBoard.keys());
				const toOsTableData = (osName: string) => {
					return {
						os_name: osName,
					};
				};

				contents = (
					<OdroidImagesTable
						columns={odroidOsTableColumns}
						data={OsNames.map((osName) => toOsTableData(osName))}
						rowKey="os_name"
						onRowClick={(row: any) => {
							console.log('Clicked: ' + row['os_name']);
							selectedByUser['os'] = row['os_name'];
							props.setModalState({
								board: true,
								os: true,
								mirrorServer: true,
								image: false,
							});
						}}
					/>
				);
				break;
			}
			case 2: {
				const mirrorNames = Array.from(MirrorServers.keys());
				const toMirrorServerTableData = (mirrorName: string) => {
					return {
						mirror_server_name: mirrorName,
					};
				};

				contents = (
					<OdroidImagesTable
						columns={odroidMirrorServersTableColumns}
						data={mirrorNames.map((mirrorName) =>
							toMirrorServerTableData(mirrorName),
						)}
						rowKey="mirror_server_name"
						onRowClick={(row: any) => {
							console.log('Clicked: ' + row['mirror_server_name']);
							selectedByUser['mirrorServer'] = row['mirror_server_name'];
							props.setModalState({
								board: true,
								os: true,
								mirrorServer: true,
								image: true,
							});
						}}
					/>
				);
				break;
			}
			case 3: {
				const OsByBoard = ImageNests.get(selectedByUser['board']);
				let targetUrl = MirrorServers.get(
					selectedByUser['mirrorServer'],
				) as string;
				targetUrl += OsByBoard?.get(selectedByUser['os']) as string;

				contents = (
					<Async promiseFn={async () => odroidImageFetch(targetUrl)}>
						{({ data, error, isLoading }) => {
							if (isLoading) {
								return 'Loading...';
							}
							if (error) {
								return { error };
							}

							if (data) {
								return (
									<OdroidImagesTable
										columns={odroidImagesTableColumns}
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

	const StepLabels = ['Board', 'OS', 'Mirror Server', 'Image'];

	const GetStep = (index: number) => {
		return (
			<Step key={index} status={isComplete[index] ? 'completed' : 'pending'}>
				{StepLabels[index]}
			</Step>
		);
	};

	const OrderedStepsWrapper = ({ ...props }) => {
		return (
			<Steps
				ordered
				activeStepIndex={currentActiveStepIndex()}
				m={1}
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

	const odroidOsTableColumns: any = [
		{
			field: 'os_name',
			label: 'OS Name',
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidMirrorServersTableColumns: any = [
		{
			field: 'mirror_server_name',
			label: 'Mirror Server Name',
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidImagesTableColumns: any = [
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

	class ImageSelectModal extends React.Component<{}, ImageSelectModalState> {
		constructor(props: {}) {
			super(props);

			this.state = {
				board: true,
				os: false,
				mirrorServer: false,
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
			} else if (nextState['mirrorServer']) {
				isComplete = [true, true, false, false];
			} else if (nextState['os']) {
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

			if (isImageUrlSet()) {
				contents = (
					<Spinner
						label="Downloading... Please wait for a moment..."
						emphasized
					/>
				);
			} else {
				contents = (
					<>
						<OrderedStepsWrapper bordered={false} />
						<ShowContents setModalState={this.update} />
					</>
				);
			}
			return contents;
		}
	}

	return (
		<Modal
			cancel={cancel}
			primaryButtonProps={{
				disabled: isImageUrlSet(),
			}}
			style={{
				width: '780px',
				height: '420px',
			}}
			done={async () => {
				await done(imageURL);
			}}
		>
			<ImageSelectModal />
		</Modal>
	);
};

interface Flow {
	icon?: JSX.Element;
	onClick: (evt: React.MouseEvent) => void;
	label: string;
}

const FlowSelector = styled(
	({ flow, ...props }: { flow: Flow; props?: ButtonProps }) => {
		return (
			<StepButton plain onClick={flow.onClick} icon={flow.icon} {...props}>
				{flow.label}
			</StepButton>
		);
	},
)`
	border-radius: 24px;
	color: rgba(255, 255, 255, 0.7);

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
	| typeof sourceDestination.Http;

export interface SourceOptions {
	imagePath: string;
	SourceType: Source;
}

interface SourceSelectorProps {
	flashing: boolean;
	afterSelected: (options: SourceOptions) => void;
}

interface SourceSelectorState {
	hasImage: boolean;
	imageName: string;
	imageSize: number;
	warning: { message: string; title: string | null } | null;
	showImageDetails: boolean;
	showOdroidImageSelector: boolean;
}

export class SourceSelector extends React.Component<
	SourceSelectorProps,
	SourceSelectorState
> {
	private unsubscribe: (() => void) | undefined;
	private afterSelected: SourceSelectorProps['afterSelected'];

	constructor(props: SourceSelectorProps) {
		super(props);
		this.state = {
			...getState(),
			warning: null,
			showImageDetails: false,
			showOdroidImageSelector: false,
		};

		this.openImageSelector = this.openImageSelector.bind(this);
		this.openOdroidImageSelector = this.openOdroidImageSelector.bind(this);
		this.reselectImage = this.reselectImage.bind(this);
		this.onSelectImage = this.onSelectImage.bind(this);
		this.onDrop = this.onDrop.bind(this);
		this.showSelectedImageDetails = this.showSelectedImageDetails.bind(this);
		this.afterSelected = props.afterSelected.bind(this);
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
		const isURL =
			imagePath.startsWith('https://') || imagePath.startsWith('http://');
		await this.selectImageByPath({
			imagePath,
			SourceType: isURL ? sourceDestination.Http : sourceDestination.File,
		});
	}

	private reselectImage() {
		analytics.logEvent('Reselect image', {
			previousImage: selectionState.getImage(),
		});

		selectionState.deselectImage();
	}

	private selectImage(
		image: sourceDestination.Metadata & {
			path: string;
			extension: string;
			hasMBR: boolean;
		},
	) {
		try {
			let message = null;
			let title = null;

			if (supportedFormats.looksLikeWindowsImage(image.path)) {
				analytics.logEvent('Possibly Windows image', { image });
				message = messages.warning.looksLikeWindowsImage();
				title = 'Possible Windows image detected';
			} else if (!image.hasMBR) {
				analytics.logEvent('Missing partition table', { image });
				title = 'Missing partition table';
				message = messages.warning.missingPartitionTable();
			}

			if (message) {
				this.setState({
					warning: {
						message,
						title,
					},
				});
			}

			selectionState.selectImage(image);
			analytics.logEvent('Select image', {
				// An easy way so we can quickly identify if we're making use of
				// certain features without printing pages of text to DevTools.
				image: {
					...image,
					logo: Boolean(image.logo),
					blockMap: Boolean(image.blockMap),
				},
			});
		} catch (error) {
			exceptionReporter.report(error);
		}
	}

	private async selectImageByPath({ imagePath, SourceType }: SourceOptions) {
		try {
			imagePath = await replaceWindowsNetworkDriveLetter(imagePath);
		} catch (error) {
			analytics.logException(error);
		}

		let source;
		if (SourceType === sourceDestination.File) {
			source = new sourceDestination.File({
				path: imagePath,
			});
		} else {
			if (
				!imagePath.startsWith('https://') &&
				!imagePath.startsWith('http://')
			) {
				const invalidImageError = errors.createUserError({
					title: 'Unsupported protocol',
					description: messages.error.unsupportedProtocol(),
				});

				osDialog.showError(invalidImageError);
				analytics.logEvent('Unsupported protocol', { path: imagePath });
				return;
			}
			source = new sourceDestination.Http({ url: imagePath });
		}

		try {
			const innerSource = await source.getInnerSource();
			const metadata = (await innerSource.getMetadata()) as sourceDestination.Metadata & {
				hasMBR: boolean;
				partitions: MBRPartition[] | GPTPartition[];
				path: string;
				extension: string;
			};
			const partitionTable = await innerSource.getPartitionTable();
			if (partitionTable) {
				metadata.hasMBR = true;
				metadata.partitions = partitionTable.partitions;
			} else {
				metadata.hasMBR = false;
			}
			metadata.path = imagePath;
			metadata.extension = path.extname(imagePath).slice(1);
			this.selectImage(metadata);
			this.afterSelected({
				imagePath,
				SourceType,
			});
		} catch (error) {
			const imageError = errors.createUserError({
				title: 'Error opening image',
				description: messages.error.openImage(
					path.basename(imagePath),
					error.message,
				),
			});
			osDialog.showError(imageError);
			analytics.logException(error);
		} finally {
			try {
				await source.close();
			} catch (error) {
				// Noop
			}
		}
	}

	private async openImageSelector() {
		analytics.logEvent('Open image selector');

		try {
			const imagePath = await osDialog.selectImage();
			// Avoid analytics and selection state changes
			// if no file was resolved from the dialog.
			if (!imagePath) {
				analytics.logEvent('Image selector closed');
				return;
			}
			this.selectImageByPath({
				imagePath,
				SourceType: sourceDestination.File,
			});
		} catch (error) {
			exceptionReporter.report(error);
		}
	}

	private onDrop(event: React.DragEvent<HTMLDivElement>) {
		const [file] = event.dataTransfer.files;
		if (file) {
			this.selectImageByPath({
				imagePath: file.path,
				SourceType: sourceDestination.File,
			});
		}
	}

	private openOdroidImageSelector() {
		analytics.logEvent('Open Odroid image URL selector');

		this.setState({
			showOdroidImageSelector: true,
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
			imagePath: selectionState.getImagePath(),
		});

		this.setState({
			showImageDetails: true,
		});
	}

	// TODO add a visual change when dragging a file over the selector
	public render() {
		const { flashing } = this.props;
		const { showImageDetails, showOdroidImageSelector } = this.state;

		const hasImage = selectionState.hasImage();

		const imagePath = selectionState.getImagePath();
		const imageBasename = hasImage ? path.basename(imagePath) : '';
		const imageName = selectionState.getImageName();
		const imageSize = selectionState.getImageSize();
		const imageLogo = selectionState.getImageLogo();

		return (
			<>
				<Flex
					flexDirection="column"
					alignItems="center"
					onDrop={this.onDrop}
					onDragEnter={this.onDragEnter}
					onDragOver={this.onDragOver}
				>
					<SVGIcon
						contents={imageLogo}
						fallback={ImageSvg}
						style={{
							marginBottom: 30,
						}}
					/>

					{hasImage ? (
						<>
							<StepNameButton
								plain
								onClick={this.showSelectedImageDetails}
								tooltip={imageName || imageBasename}
							>
								{middleEllipsis(imageName || imageBasename, 20)}
							</StepNameButton>
							{!flashing && (
								<ChangeButton plain mb={14} onClick={this.reselectImage}>
									Remove
								</ChangeButton>
							)}
							<DetailsText>{shared.bytesToClosestUnit(imageSize)}</DetailsText>
						</>
					) : (
						<>
							<FlowSelector
								key="Flash from file"
								flow={{
									onClick: this.openImageSelector,
									label: 'Flash from file',
									icon: <FileSvg height="1em" fill="currentColor" />,
								}}
							/>
							<FlowSelector
								key="Flash Odroid image"
								flow={{
									onClick: this.openOdroidImageSelector,
									label: 'Flash Odroid image',
									icon: <LinkSvg height="1em" fill="currentColor" />,
								}}
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
							this.reselectImage();
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
							this.setState({
								showOdroidImageSelector: false,
							});
						}}
						done={async (imageURL: string) => {
							// Avoid analytics and selection state changes
							// if no file was resolved from the dialog.
							if (!imageURL) {
								analytics.logEvent('URL selector closed');
								this.setState({
									showOdroidImageSelector: false,
								});
								return;
							}

							await this.selectImageByPath({
								imagePath: imageURL,
								SourceType: sourceDestination.Http,
							});
							this.setState({
								showOdroidImageSelector: false,
							});
						}}
					/>
				)}
			</>
		);
	}
}
