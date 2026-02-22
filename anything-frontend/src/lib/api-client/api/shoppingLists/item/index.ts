/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createShoppingListFromDiscriminatorValue, type ShoppingList } from '../../../models/index';
// @ts-ignore
import { ShoppingListsItemCompleteRequestBuilderRequestsMetadata, type ShoppingListsItemCompleteRequestBuilder } from './complete/index';
// @ts-ignore
import { ShoppingListsItemItemsRequestBuilderNavigationMetadata, ShoppingListsItemItemsRequestBuilderRequestsMetadata, type ShoppingListsItemItemsRequestBuilder } from './items/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/shopping-lists/{id}
 */
export interface ShoppingListsItemRequestBuilder extends BaseRequestBuilder<ShoppingListsItemRequestBuilder> {
    /**
     * The complete property
     */
    get complete(): ShoppingListsItemCompleteRequestBuilder;
    /**
     * The items property
     */
    get items(): ShoppingListsItemItemsRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<ShoppingList>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<ShoppingList | undefined>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toGetRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const ShoppingListsItemRequestBuilderUriTemplate = "{+baseurl}/api/shopping-lists/{id}";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const ShoppingListsItemRequestBuilderNavigationMetadata: Record<Exclude<keyof ShoppingListsItemRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    complete: {
        requestsMetadata: ShoppingListsItemCompleteRequestBuilderRequestsMetadata,
    },
    items: {
        requestsMetadata: ShoppingListsItemItemsRequestBuilderRequestsMetadata,
        navigationMetadata: ShoppingListsItemItemsRequestBuilderNavigationMetadata,
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: ShoppingListsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    get: {
        uriTemplate: ShoppingListsItemRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createShoppingListFromDiscriminatorValue,
    },
};
/* tslint:enable */
/* eslint-enable */
