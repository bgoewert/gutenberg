/**
 * WordPress dependencies
 */
import { serialize, createBlock } from '@wordpress/blocks';
import {
	Placeholder,
	Button,
	DropdownMenu,
	MenuGroup,
	MenuItem,
	Spinner,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useDispatch } from '@wordpress/data';
import { useCallback, useState, useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { navigation, chevronDown, Icon } from '@wordpress/icons';

/**
 * Internal dependencies
 */

import useNavigationEntities from '../../use-navigation-entities';
import PlaceholderPreview from './placeholder-preview';
import menuItemsToBlocks from '../../menu-items-to-blocks';
import NavigationMenuNameModal from '../navigation-menu-name-modal';
import useNavigationMenu from '../../use-navigation-menu';

export default function NavigationPlaceholder( {
	onFinish,
	canSwitchNavigationMenu,
	hasResolvedNavigationMenu,
} ) {
	const [ selectedMenu, setSelectedMenu ] = useState();

	const [ isCreatingFromMenu, setIsCreatingFromMenu ] = useState( false );

	const [ menuName, setMenuName ] = useState( '' );

	const [ isNewMenuModalVisible, setIsNewMenuModalVisible ] = useState(
		false
	);

	const [ createEmpty, setCreateEmpty ] = useState( false );

	const { saveEntityRecord } = useDispatch( coreStore );

	// This callback uses data from the two placeholder steps and only creates
	// a new navigation menu when the user completes the final step.
	const createNavigationMenu = useCallback(
		async ( title = __( 'Untitled Navigation Menu' ), blocks = [] ) => {
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
		[ serialize, saveEntityRecord ]
	);

	const onFinishMenuCreation = async ( navigationMenuTitle, blocks ) => {
		const navigationMenu = await createNavigationMenu(
			navigationMenuTitle,
			blocks
		);
		onFinish( navigationMenu );
	};

	const {
		isResolvingPages,
		menus,
		isResolvingMenus,
		menuItems,
		hasResolvedMenuItems,
		hasPages,
		hasMenus,
	} = useNavigationEntities( selectedMenu );

	const isStillLoading = isResolvingPages || isResolvingMenus;

	const createFromMenu = useCallback(
		( name ) => {
			const { innerBlocks: blocks } = menuItemsToBlocks( menuItems );
			onFinishMenuCreation( name, blocks );
		},
		[ menuItems, menuItemsToBlocks, onFinish ]
	);

	const onCreateFromMenu = ( name ) => {
		// If we have menu items, create the block right away.
		if ( hasResolvedMenuItems ) {
			createFromMenu( name );
			return;
		}

		// Otherwise, create the block when resolution finishes.
		setIsCreatingFromMenu( true );
		// Store the name to use later.
		setMenuName( name );
	};

	const onCreateEmptyMenu = ( name ) => {
		onFinishMenuCreation( name, [] );
	};

	const onCreateAllPages = ( name ) => {
		const block = [ createBlock( 'core/page-list' ) ];
		onFinishMenuCreation( name, block );
		setIsNewMenuModalVisible( true );
	};

	useEffect( () => {
		// If the user selected a menu but we had to wait for menu items to
		// finish resolving, then create the block once resolution finishes.
		if ( isCreatingFromMenu && hasResolvedMenuItems ) {
			createFromMenu( menuName );
			setIsCreatingFromMenu( false );
		}
	}, [ isCreatingFromMenu, hasResolvedMenuItems, menuName ] );

	const toggleProps = {
		variant: 'primary',
		className: 'wp-block-navigation-placeholder__actions__dropdown',
	};

	const { navigationMenus } = useNavigationMenu();

	return (
		<>
			{ ! hasResolvedNavigationMenu && <PlaceholderPreview isLoading /> }
			{ hasResolvedNavigationMenu && (
				<Placeholder className="wp-block-navigation-placeholder">
					<PlaceholderPreview />

					<div className="wp-block-navigation-placeholder__controls">
						{ isStillLoading && (
							<div>
								<Spinner />
							</div>
						) }
						{ ! isStillLoading && (
							<div className="wp-block-navigation-placeholder__actions">
								<div className="wp-block-navigation-placeholder__actions__indicator">
									<Icon icon={ navigation } />{ ' ' }
									{ __( 'Navigation' ) }
								</div>
								{ hasMenus || canSwitchNavigationMenu ? (
									<DropdownMenu
										text={ __( 'Add existing menu' ) }
										icon={ chevronDown }
										toggleProps={ toggleProps }
									>
										{ ( { onClose } ) => (
											<MenuGroup>
												{ canSwitchNavigationMenu &&
													navigationMenus.map(
														( menu ) => {
															return (
																<MenuItem
																	onClick={ () => {
																		setSelectedMenu(
																			menu.id
																		);
																		onFinish(
																			menu
																		);
																	} }
																	onClose={
																		onClose
																	}
																	key={
																		menu.id
																	}
																>
																	{
																		menu
																			.title
																			.rendered
																	}
																</MenuItem>
															);
														}
													) }
												{ menus.map( ( menu ) => {
													return (
														<MenuItem
															onClick={ () => {
																setSelectedMenu(
																	menu.id
																);
																onCreateFromMenu(
																	menu.name
																);
															} }
															onClose={ onClose }
															key={ menu.id }
														>
															{ menu.name }
														</MenuItem>
													);
												} ) }
											</MenuGroup>
										) }
									</DropdownMenu>
								) : undefined }
								{ hasPages ? (
									<Button
										variant={
											hasMenus ? 'tertiary' : 'primary'
										}
										onClick={ () => {
											setIsNewMenuModalVisible( true );
											setCreateEmpty( false );
										} }
									>
										{ __( 'Add all pages' ) }
									</Button>
								) : undefined }
								<Button
									variant="tertiary"
									onClick={ () => {
										setIsNewMenuModalVisible( true );
										setCreateEmpty( true );
									} }
								>
									{ __( 'Start empty' ) }
								</Button>
							</div>
						) }
					</div>
				</Placeholder>
			) }
			{ isNewMenuModalVisible && (
				<NavigationMenuNameModal
					title={ __( 'Create your new navigation menu' ) }
					onRequestClose={ () => {
						setIsNewMenuModalVisible( false );
					} }
					onFinish={
						createEmpty ? onCreateEmptyMenu : onCreateAllPages
					}
				/>
			) }
		</>
	);
}
