/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { createRecipeIngredientFromDiscriminatorValue, serializeCreateRecipeIngredientRequest, type CreateRecipeIngredientRequest, type RecipeIngredient } from '../../../../models/index';
// @ts-ignore
import { RecipesItemIngredientsItemRequestBuilderRequestsMetadata, type RecipesItemIngredientsItemRequestBuilder } from './item/index';
// @ts-ignore
import { type BaseRequestBuilder, type KeysToExcludeForNavigationMetadata, type NavigationMetadata, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/ingredients
 */
export interface RecipesItemIngredientsRequestBuilder extends BaseRequestBuilder<RecipesItemIngredientsRequestBuilder> {
    /**
     * Gets an item from the ingredients collection
     * @param ingredientId Unique identifier of the item
     * @returns {RecipesItemIngredientsItemRequestBuilder}
     */
     byId(ingredientId: number) : RecipesItemIngredientsItemRequestBuilder;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<RecipeIngredient[]>}
     */
     get(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<RecipeIngredient[] | undefined>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {Promise<RecipeIngredient>}
     */
     post(body: CreateRecipeIngredientRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<RecipeIngredient | undefined>;
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
     toPostRequestInformation(body: CreateRecipeIngredientRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemIngredientsRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/ingredients";
/**
 * Metadata for all the navigation properties in the request builder.
 */
export const RecipesItemIngredientsRequestBuilderNavigationMetadata: Record<Exclude<keyof RecipesItemIngredientsRequestBuilder, KeysToExcludeForNavigationMetadata>, NavigationMetadata> = {
    byId: {
        requestsMetadata: RecipesItemIngredientsItemRequestBuilderRequestsMetadata,
        pathParametersMappings: ["ingredientId"],
    },
};
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemIngredientsRequestBuilderRequestsMetadata: RequestsMetadata = {
    get: {
        uriTemplate: RecipesItemIngredientsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "sendCollection",
        responseBodyFactory: createRecipeIngredientFromDiscriminatorValue,
    },
    post: {
        uriTemplate: RecipesItemIngredientsRequestBuilderUriTemplate,
        responseBodyContentType: "application/json",
        adapterMethodName: "send",
        responseBodyFactory: createRecipeIngredientFromDiscriminatorValue,
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeCreateRecipeIngredientRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
