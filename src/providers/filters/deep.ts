import { lstatSync, realpathSync } from 'fs';
import { join } from 'path';
import { Entry, MicromatchOptions, EntryFilterFunction, Pattern, PatternRe } from '../../types';
import Settings from '../../settings';
import * as utils from '../../utils';
import PartialMatcher from '../matchers/partial';

export default class DeepFilter {
	private readonly _visitedSymbolicLinks: Set<string> = new Set();

	constructor(private readonly _settings: Settings, private readonly _micromatchOptions: MicromatchOptions) { }

	public getFilter(basePath: string, positive: Pattern[], negative: Pattern[]): EntryFilterFunction {
		const matcher = this._getMatcher(positive);
		const negativeRe = this._getNegativePatternsRe(negative);

		return (entry) => this._filter(basePath, entry, matcher, negativeRe);
	}

	private _getMatcher(patterns: Pattern[]): PartialMatcher {
		return new PartialMatcher(patterns, this._settings, this._micromatchOptions);
	}

	private _getNegativePatternsRe(patterns: Pattern[]): PatternRe[] {
		const affectDepthOfReadingPatterns = patterns.filter(utils.pattern.isAffectDepthOfReadingPattern);

		return utils.pattern.convertPatternsToRe(affectDepthOfReadingPatterns, this._micromatchOptions);
	}

	private _filter(basePath: string, entry: Entry, matcher: PartialMatcher, negativeRe: PatternRe[]): boolean {
		if (this._isSkippedByDeep(basePath, entry.path)) {
			return false;
		}

		if (this._isSkippedSymbolicLink(entry)) {
			return false;
		}

		if (this._alreadyVisitedSymbolicLinkRealPath(entry)) {
			return false;
		}

		const filepath = utils.path.removeLeadingDotSegment(entry.path);

		if (this._isSkippedByPositivePatterns(filepath, matcher)) {
			return false;
		}

		return this._isSkippedByNegativePatterns(filepath, negativeRe);
	}

	private _isSkippedByDeep(basePath: string, entryPath: string): boolean {
		/**
		 * Avoid unnecessary depth calculations when it doesn't matter.
		 */
		if (this._settings.deep === Infinity) {
			return false;
		}

		return this._getEntryLevel(basePath, entryPath) >= this._settings.deep;
	}

	private _getEntryLevel(basePath: string, entryPath: string): number {
		const entryPathDepth = entryPath.split('/').length;

		if (basePath === '') {
			return entryPathDepth;
		}

		const basePathDepth = basePath.split('/').length;

		return entryPathDepth - basePathDepth;
	}

	private _isSkippedSymbolicLink(entry: Entry): boolean {
		return !this._settings.followSymbolicLinks && entry.dirent.isSymbolicLink();
	}

	private _isSkippedByPositivePatterns(entryPath: string, matcher: PartialMatcher): boolean {
		return !this._settings.baseNameMatch && !matcher.match(entryPath);
	}

	private _isSkippedByNegativePatterns(entryPath: string, patternsRe: PatternRe[]): boolean {
		return !utils.pattern.matchAny(entryPath, patternsRe);
	}

	private _alreadyVisitedSymbolicLinkRealPath(entry: Entry): boolean {
		if (!this._settings.followSymbolicLinksOnce) {
			return false;
		}

		const fullPath = join(this._settings.cwd, entry.path);
		if (!lstatSync(fullPath).isSymbolicLink()) {
			return this._visitedSymbolicLinks.has(fullPath);
		}

		const realPath = realpathSync(fullPath);
		if (this._visitedSymbolicLinks.has(realPath)) {
			return true;
		}

		this._visitedSymbolicLinks.add(realPath);
		return false;
	}
}
