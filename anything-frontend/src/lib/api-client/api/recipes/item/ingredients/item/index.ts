/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeUpdateRecipeIngredientRequest, type UpdateRecipeIngredientRequest } from '../../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/ingredients/{ingredientId}
 */
export interface RecipesItemIngredientsItemRequestBuilder extends BaseRequestBuilder<RecipesItemIngredientsItemRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     put(body: UpdateRecipeIngredientRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toDeleteRequestInformation(requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPutRequestInformation(body: UpdateRecipeIngredientRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemIngredientsItemRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/ingredients/{ingredientId}";
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemIngredientsItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: RecipesItemIngredientsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    put: {
        uriTemplate: RecipesItemIngredientsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateRecipeIngredientRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
