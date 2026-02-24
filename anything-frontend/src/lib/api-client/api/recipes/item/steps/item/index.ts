/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { serializeUpdateRecipeStepRequest, type UpdateRecipeStepRequest } from '../../../../../models/index';
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata } from '@microsoft/kiota-abstractions';

/**
 * Builds and executes requests for operations under /api/recipes/{id}/steps/{stepId}
 */
export interface RecipesItemStepsItemRequestBuilder extends BaseRequestBuilder<RecipesItemStepsItemRequestBuilder> {
    /**
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     delete(requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
     put(body: UpdateRecipeStepRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : Promise<void>;
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
     toPutRequestInformation(body: UpdateRecipeStepRequest, requestConfiguration?: RequestConfiguration<object> | undefined) : RequestInformation;
}
/**
 * Uri template for the request builder.
 */
export const RecipesItemStepsItemRequestBuilderUriTemplate = "{+baseurl}/api/recipes/{id}/steps/{stepId}";
/**
 * Metadata for all the requests in the request builder.
 */
export const RecipesItemStepsItemRequestBuilderRequestsMetadata: RequestsMetadata = {
    delete: {
        uriTemplate: RecipesItemStepsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
    },
    put: {
        uriTemplate: RecipesItemStepsItemRequestBuilderUriTemplate,
        adapterMethodName: "sendNoResponseContent",
        requestBodyContentType: "application/json",
        requestBodySerializer: serializeUpdateRecipeStepRequest,
        requestInformationContentSetMethod: "setContentFromParsable",
    },
};
/* tslint:enable */
/* eslint-enable */
