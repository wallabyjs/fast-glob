import { performance } from 'perf_hooks';
import * as bencho from 'bencho';

export function timeStart(): number {
	return performance.now();
}

export function timeEnd(start: number): number {
	return performance.now() - start;
}

export function getMemory(): number {
	return process.memoryUsage().heapUsed;
}

export function importCurrentFastGlob(): Promise<typeof import('..')> {
	return import('..');
}

export function importPreviousFastGlob(): Promise<typeof import('fast-glob')> {
	return import('fast-glob');
}

export function importNodeGlob(): Promise<typeof import('glob')> {
	return import('glob');
}

export function importFdir(): Promise<typeof import('fdir')> {
	return import('fdir');
}

export async function importAndMeasure<T extends () => Promise<unknown>>(func: T): Promise<ReturnType<T>> {
	const start = timeStart();

	const result = await func();

	const time = timeEnd(start);

	bencho.time('import.time', time);

	return result;
}
