/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeAddIngredientsToShoppingListRequest, type AddIngredientsToShoppingListRequest } from '../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/add-to-shopping-list
 */
export interface RecipesItemAddToShoppingListRequestBuilder extends BaseRequestBuilder<RecipesItemAddToShoppingListRequestBuilder> {
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     post(body: AddIngredientsToShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
     toPostRequestInformation(body: AddIngredientsToShoppingListRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemAddToShoppingListRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/add-to-shopping-list";
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemAddToShoppingListRequestBuilderRequestsMetadata: RequestsMetadata = {
    post: {
        uriTemplate: RecipesItemAddToShoppingListRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeAddIngredientsToShoppingListRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
