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
			['ANDROID_PIE_64', 'S905X3/ODROID-C4/Android/pie/64'],
			['ANDROID_PIE_32', 'S905X3/ODROID-C4/Android/pie/32'],
		]),
	],
]);
