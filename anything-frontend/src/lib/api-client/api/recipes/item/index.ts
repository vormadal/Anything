/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createRecipeFromDiscriminatorValue, serializeUpdateRecipeRequest, type Recipe, type UpdateRecipeRequest } from '../../../models/index';
// @ts-ignore
import { RecipesItemAddToShoppingListRequestBuilderRequestsMetadata, type RecipesItemAddToShoppingListRequestBuilder } from './addToShoppingList/index';
// @ts-ignore
import { RecipesItemIngredientsRequestBuilderNavigationMetadata, RecipesItemIngredientsRequestBuilderRequestsMetadata, type RecipesItemIngredientsRequestBuilder } from './ingredients/index';
// @ts-ignore
import { RecipesItemStepsRequestBuilderNavigationMetadata, RecipesItemStepsRequestBuilderRequestsMetadata, type RecipesItemStepsRequestBuilder } from './steps/index';
// @ts-ignore
import { RecipesItemImagesRequestBuilderNavigationMetadata, RecipesItemImagesRequestBuilderRequestsMetadata, type RecipesItemImagesRequestBuilder } from './images/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}
 */
export interface RecipesItemRequestBuilder extends BaseRequestBuilder<RecipesItemRequestBuilder> {
    /**
     * The addToShoppingList property
     */
    get addToShoppingList(): RecipesItemAddToShoppingListRequestBuilder;
    /**
     * The ingredients property
     */
    get ingredients(): RecipesItemIngredientsRequestBuilder;
    /**
     * The steps property
     */
    get steps(): RecipesItemStepsRequestBuilder;
    /**
     * The images property
     */
    get images(): RecipesItemImagesRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<Recipe>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<Recipe | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     put(body: UpdateRecipeRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
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
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPutRequestInformation(body: UpdateRecipeRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const RecipesItemRequestBuilderNavigationMetadata: Record<Exclude<keyof RecipesItemRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    addToShoppingList: {
        requestsMetadata: RecipesItemAddToShoppingListRequestBuilderRequestsMetadata,
    },
    ingredients: {
        requestsMetadata: RecipesItemIngredientsRequestBuilderRequestsMetadata,
        navigationMetadata: RecipesItemIngredientsRequestBuilderNavigationMetadata,
    },
    steps: {
        requestsMetadata: RecipesItemStepsRequestBuilderRequestsMetadata,
        navigationMetadata: RecipesItemStepsRequestBuilderNavigationMetadata,
    },
    images: {
        requestsMetadata: RecipesItemImagesRequestBuilderRequestsMetadata,
        navigationMetadata: RecipesItemImagesRequestBuilderNavigationMetadata,
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: RecipesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    get: {
        uriTemplate: RecipesItemRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createRecipeFromDiscriminatorValue,
    },
    put: {
        uriTemplate: RecipesItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateRecipeRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
