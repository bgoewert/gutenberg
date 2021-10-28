/**
 * WordPress dependencies
 */
import { __experimentalUseInnerBlocksProps as useInnerBlocksProps } from '@wordpress/block-editor';
import { serialize } from '@wordpress/blocks';
import { Disabled } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch, useSelect } from '@wordpress/data';
import { useCallback, useContext, useEffect, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import useNavigationMenu from '../use-navigation-menu';

export default function UnsavedInnerBlocks( { blockProps, blocks, onSave } ) {
	const isDisabled = useContext( Disabled.Context );
	const { hasResolvedNavigationMenus, navigationMenus } = useNavigationMenu();
	const savingLock = useRef( false );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		renderAppender: false,
	} );
	const { saveEntityRecord } = useDispatch( coreStore );

	const isSaving = useSelect(
		( select ) =>
			select( coreStore ).isSavingEntityRecord(
				'postType',
				'wp_naviation'
			),
		[]
	);

	const createNavigationMenu = useCallback(
		async ( title ) => {
			const record = {
				title,
				content: serialize( blocks ),
				status: 'publish',
			};

			const navigationMenu = await saveEntityRecord(
				'postType',
				'wp_navigation',
				record
			);

			return navigationMenu;
		},
		[ blocks, serialize, saveEntityRecord ]
	);

	// Automatically save the uncontrolled blocks.
	useEffect( async () => {
		// The block will be disabled when used in a BlockPreview.
		// In this case avoid automatic creation of a wp_navigation post.
		// Otherwise the user will be spammed with lots of menus!
		//
		// Also ensure other navigation menus have loaded so an
		// accurate name can be created.
		//
		// And finally don't try saving when another save is already
		// in progress.
		if (
			isDisabled ||
			isSaving ||
			savingLock.current ||
			! hasResolvedNavigationMenus
		) {
			return;
		}

		savingLock.current = true;
		const title = __( 'Untitled menu' );

		// Determine how many menus start with the same title.
		const matchingMenuTitleCount = navigationMenus?.reduce(
			( count, menu ) =>
				menu?.title?.raw?.startsWith( title ) ? count + 1 : count,
			0
		);

		// Append a number to the end of the title if a menu with
		// the same name exists.
		const titleWithCount =
			matchingMenuTitleCount > 0
				? `${ title } ${ matchingMenuTitleCount + 1 }`
				: title;

		const menu = await createNavigationMenu( titleWithCount );
		savingLock.current = false;
		onSave( menu );
	}, [
		createNavigationMenu,
		hasResolvedNavigationMenus,
		isDisabled,
		isSaving,
		navigationMenus,
	] );

	// The uncontrolled inner blocks must be rendered. If they're not rendered,
	// the block editor will reset them to an empty array.
	return (
		<>
			<nav { ...blockProps }>
				<Disabled>
					<div { ...innerBlocksProps } />
				</Disabled>
			</nav>
		</>
	);
}
