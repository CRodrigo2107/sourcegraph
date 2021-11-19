import classNames from 'classnames'
import React, { ReactElement, useCallback } from 'react'

import { Link } from '@sourcegraph/shared/src/components/Link'
import { CaseSensitivityProps, PatternTypeProps, SearchContextProps } from '@sourcegraph/shared/src/search'
import { QueryChangeSource, QueryState } from '@sourcegraph/shared/src/search/helpers'
import {
    createQueryExampleFromString,
    updateQueryWithFilterAndExample,
} from '@sourcegraph/shared/src/search/helpers/queryExample'
import { FilterType } from '@sourcegraph/shared/src/search/query/filters'
import { updateFilter } from '@sourcegraph/shared/src/search/query/transformer'
import { containsLiteralOrPattern } from '@sourcegraph/shared/src/search/query/validate'
import { SearchType } from '@sourcegraph/shared/src/search/stream'
import { buildSearchURLQuery } from '@sourcegraph/shared/src/util/url'

import styles from './SearchSidebarSection.module.scss'

export interface SearchTypeLinksProps
    extends Omit<PatternTypeProps, 'setPatternType'>,
        Omit<CaseSensitivityProps, 'setCaseSensitivity'>,
        Pick<SearchContextProps, 'selectedSearchContextSpec'> {
    query: string
    onNavbarQueryChange: (queryState: QueryState) => void
    /**
     * Force search type links to be rendered as buttons.
     * Used e.g. in the VS Code extension to update search query state.
     * */
    forceButton?: boolean
}

interface SearchTypeLinkProps extends SearchTypeLinksProps {
    type: SearchType
    children: string
}

/**
 * SearchTypeLink renders to a Link which immediately triggers a new search when
 * clicked.
 */
const SearchTypeLink: React.FunctionComponent<SearchTypeLinkProps> = ({
    type,
    query,
    patternType,
    caseSensitive,
    selectedSearchContextSpec,
    children,
}) => {
    const builtURLQuery = buildSearchURLQuery(
        updateFilter(query, FilterType.type, type as string),
        patternType,
        caseSensitive,
        selectedSearchContextSpec
    )

    return (
        <Link to={{ pathname: '/search', search: builtURLQuery }} className={styles.sidebarSectionListItem}>
            {children}
        </Link>
    )
}

interface SearchTypeButtonProps {
    children: string
    onClick: () => void
}

/**
 * SearchTypeButton renders to a button which updates the query state without
 * triggering a search. This allows users to adjust the query.
 */
const SearchTypeButton: React.FunctionComponent<SearchTypeButtonProps> = ({ children, onClick }) => (
    <button
        className={classNames(styles.sidebarSectionListItem, styles.sidebarSectionButtonLink, 'btn btn-link flex-1')}
        type="button"
        value={children}
        onClick={onClick}
    >
        {children}
    </button>
)

/**
 * SearchSymbolButton either renders to a Link or a button, depending on whether
 * the search should be triggered immediately at click (if the query contains
 * patterns) or whether to allow the user to complete query and triggering it
 * themselves.
 */
const SearchSymbol: React.FunctionComponent<Omit<SearchTypeLinkProps, 'type'>> = props => {
    const type = 'symbol'
    const { query, onNavbarQueryChange } = props

    const setSymbolSearch = useCallback(() => {
        onNavbarQueryChange({
            query: updateFilter(query, FilterType.type, type),
        })
    }, [query, onNavbarQueryChange])

    if (!props.forceButton && containsLiteralOrPattern(query)) {
        return (
            <SearchTypeLink {...props} type={type}>
                {props.children}
            </SearchTypeLink>
        )
    }
    return <SearchTypeButton onClick={setSymbolSearch}>{props.children}</SearchTypeButton>
}

const repoExample = createQueryExampleFromString('{regexp-pattern}')

export const getSearchTypeLinks = (props: SearchTypeLinksProps): ReactElement[] => {
    function updateQueryWithRepoExample(): void {
        const updatedQuery = updateQueryWithFilterAndExample(props.query, FilterType.repo, repoExample, {
            singular: false,
            negate: false,
            emptyValue: true,
        })
        props.onNavbarQueryChange({
            changeSource: QueryChangeSource.searchTypes,
            query: updatedQuery.query,
            selectionRange: updatedQuery.placeholderRange,
            revealRange: updatedQuery.filterRange,
            showSuggestions: true,
        })
    }

    function updateQueryWithType(type: string): void {
        props.onNavbarQueryChange({
            query: updateFilter(props.query, FilterType.type, type),
        })
    }

    const SearchTypeLinkOrButton = props.forceButton ? SearchTypeButton : SearchTypeLink

    return [
        <SearchTypeButton onClick={updateQueryWithRepoExample} key="repo">
            Search repos by org or name
        </SearchTypeButton>,
        <SearchSymbol {...props} key="symbol">
            Find a symbol
        </SearchSymbol>,
        <SearchTypeLinkOrButton {...props} type="diff" key="diff" onClick={() => updateQueryWithType('diff')}>
            Search diffs
        </SearchTypeLinkOrButton>,
        <SearchTypeLinkOrButton {...props} type="commit" key="commit" onClick={() => updateQueryWithType('commit')}>
            Search commit messages
        </SearchTypeLinkOrButton>,
    ]
}
