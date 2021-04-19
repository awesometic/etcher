import * as React from 'react';

import { Async } from 'react-async';
import styled from 'styled-components';
import { Flex, Txt, Step, Steps, Spinner, List, Link, Alert } from 'rendition';
import { Modal, Table } from '../../styled-components';
import { open as openExternal } from '../../os/open-external/services/open-external';

import { odroidImageFetch, getImagesManifest } from './fetch';
import { NameFilters } from './name-filters';
import { OdroidImageInfo } from './odroid-image';
import { OdroidImageStepInfo } from './odroid-image-step';
import { SelectedOptions } from './selected-options';

export const OdroidImageSelector = ({
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

		[data-display='table-head']
			> [data-display='table-row']
			> [data-display='table-cell']
			> button {
			font-weight: inherit;
			width: inherit;
			height: inherit;

			&:not(:focus) {
				color: inherit;
			}
		}

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

		[data-display='table-head']
			> [data-display='table-row']
			> [data-display='table-cell']
			> button {
			font-weight: inherit;
			width: inherit;
			height: inherit;

			&:not(:focus) {
				color: inherit;
			}
		}

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
					if (
						(element[1] as []).hasOwnProperty(
							SelectedOptions.selectedByUser.board,
						)
					) {
						distributorNames.push(element[0]);
					}
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
						os_name: imageName,
					};
				};

				const addrJsonWithSelectedDist =
					props.addressesJsonObject['Distributor'][
						SelectedOptions.selectedByUser.distributor
					];

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
						data={imageNames.map((osName) => toImageTableData(osName))}
						rowKey="os_name"
						onRowClick={(row: any) => {
							console.log('Clicked: ' + row['os_name']);
							SelectedOptions.selectedByUser.os = row['os_name'];
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
						SelectedOptions.selectedByUser.os
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

	const GetStep = (
		index: number,
		setModalState: (nextState: ImageSelectModalState) => void,
	) => {
		return (
			<Step
				key={index}
				status={isComplete[index] ? 'completed' : 'pending'}
				onClick={() => {
					isComplete.forEach((_, arrayIndex, theArray) => {
						theArray[arrayIndex] = arrayIndex <= index;
					});

					setModalState({
						board: isComplete[0],
						distributor: isComplete[1],
						os: isComplete[2],
						image: isComplete[3],
					});
				}}
			>
				{StepLabels[index]}
			</Step>
		);
	};

	const OrderedSteps = (props: {
		setModalState: (nextState: ImageSelectModalState) => void;
	}) => {
		return (
			<Steps
				ordered
				activeStepIndex={currentActiveStepIndex()}
				pb={2}
				bordered={false}
			>
				{StepLabels.map((_null, index) => GetStep(index, props.setModalState))}
			</Steps>
		);
	};

	const odroidBoardsTableColumns: any = [
		{
			field: 'board_name',
			label: 'Board Name',
			sortable: true,
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidDistributorTableColumns: any = [
		{
			field: 'distributor_name',
			label: 'Distributor Name',
			sortable: true,
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidImageTableColumns: any = [
		{
			field: 'os_name',
			label: 'OS Name',
			sortable: true,
			render: (value: string) => <code>{value}</code>,
		},
	];

	const odroidFilesTableColumns: any = [
		{
			field: 'file_name',
			label: 'Name',
			sortable: true,
			render: (value: string) => <code>{value}</code>,
		},
		{
			field: 'file_size',
			label: 'Size',
			sortable: true,
			render: (value: string) => <span>{value}</span>,
		},
		{
			field: 'last_modified',
			label: 'Last Modified',
			sortable: true,
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
			} else if (nextState['board']) {
				isComplete = [false, false, false, false];
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
								<OrderedSteps setModalState={this.update} />
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
												<b>OS</b>: {SelectedOptions.selectedByUser.os}
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
					{({ data, error, isLoading, reload }) => {
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
								<>
									<Flex
										flexDirection="column"
										justifyContent="center"
										alignItems="center"
										height="55%"
									>
										<Txt.p>
											<Txt bold align="center">
												Failed to fetch the image list.{' '}
												<a onClick={reload} href="">
													Click here to retry.
												</a>
											</Txt>
											<Txt>- {error}</Txt>
										</Txt.p>
									</Flex>
									<Flex flexDirection="column" height="45%">
										<Alert info>
											If you keep having a trouble with this, please contact me
											by visiting one of these pages. <br />
											<List>
												<Txt>
													<Link
														onClick={() =>
															openExternal(
																'https://forum.odroid.com/viewtopic.php?f=55&t=40411',
															)
														}
													>
														Odroid Etcher development thread at Odroid forum
													</Link>
												</Txt>
												<Txt>
													<Link
														onClick={() =>
															openExternal(
																'https://github.com/awesometic/odroid-etcher',
															)
														}
													>
														Odroid Etcher Github repository
													</Link>
												</Txt>
											</List>
										</Alert>
									</Flex>
								</>
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
