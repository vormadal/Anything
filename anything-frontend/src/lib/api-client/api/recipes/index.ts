/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createRecipeFromDiscriminatorValue, serializeCreateRecipeRequest, type CreateRecipeRequest, type Recipe } from '../../models/index';
// @ts-ignore
import { RecipesItemRequestBuilderNavigationMetadata, RecipesItemRequestBuilderRequestsMetadata, type RecipesItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes
 */
export interface RecipesRequestBuilder extends BaseRequestBuilder<RecipesRequestBuilder> {
    /**
     * Gets an item from the ApiSdk.api.recipes.item collection
     * @param id Unique identifier of the item
     * @returns {RecipesItemRequestBuilder}
     */
     byId(id: number) : RecipesItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<Recipe[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<Recipe[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<Recipe>}
     */
     post(body: CreateRecipeRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<Recipe | undefined>;
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
     toPostRequestInformation(body: CreateRecipeRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesRequestBuilderUriTemplate = "{+baseurl}/api/recipes";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const RecipesRequestBuilderNavigationMetadata: Record<Exclude<keyof RecipesRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: RecipesItemRequestBuilderRequestsMetadata,
        navigationMetadata: RecipesItemRequestBuilderNavigationMetadata,
        pathParametersMappings: ["id"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: RecipesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createRecipeFromDiscriminatorValue,
    },
    post: {
        uriTemplate: RecipesRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createRecipeFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateRecipeRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
