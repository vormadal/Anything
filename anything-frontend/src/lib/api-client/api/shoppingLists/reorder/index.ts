/* tslint:disable */
/* eslint-disable */
// @ts-ignore
import { type BaseRequestBuilder, type Parsable, type ParsableFactory, type RequestConfiguration, type RequestInformation, type RequestsMetadata, type SerializationWriter } from '@microsoft/kiota-abstractions';

export interface ReorderShoppingListsRequest extends Parsable {
    ids?: number[];
    additionalData?: Record<string, unknown>;
}

export function serializeReorderShoppingListsRequest(
    writer: SerializationWriter,
    request: Partial<ReorderShoppingListsRequest> | undefined | null = {},
    _isSerializingDerivedType = false
): void {
    if (!request || _isSerializingDerivedType) return;
    writer.writeCollectionOfPrimitiveValues('ids', request.ids);
    writer.writeAdditionalData(request.additionalData);
}

export function createReorderShoppingListsRequestFromDiscriminatorValue() {
    return deserializeIntoReorderShoppingListsRequest;
}

export function deserializeIntoReorderShoppingListsRequest(
    request: Partial<ReorderShoppingListsRequest> | undefined = {}
): Record<string, (node: import('@microsoft/kiota-abstractions').ParseNode) => void> {
    return {
        'ids': n => { request.ids = n.getCollectionOfPrimitiveValues<number>(); },
    };
}

/**
 * Builds and executes requests for operations under /api/shopping-lists/reorder
 */
export interface ShoppingListsReorderRequestBuilder extends BaseRequestBuilder<ShoppingListsReorderRequestBuilder> {
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     */
    put(body: ReorderShoppingListsRequest, requestConfiguration?: RequestConfiguration<object> | undefined): Promise<void>;
    /**
     * @param body The request body
     * @param requestConfiguration Configuration for the request such as headers, query parameters, and middleware options.
     * @returns {RequestInformation}
     */
    toPutRequestInformation(body: ReorderShoppingListsRequest, requestConfiguration?: RequestConfiguration<object> | undefined): RequestInformation;
}

/**
 * Uri template for the request builder.
 */
export const ShoppingListsReorderRequestBuilderUriTemplate = '{+baseurl}/api/shopping-lists/reorder';

/**
 * Metadata for all the requests in the request builder.
 */
export const ShoppingListsReorderRequestBuilderRequestsMetadata: RequestsMetadata = {
    put: {
        uriTemplate: ShoppingListsReorderRequestBuilderUriTemplate,
        adapterMethodName: 'sendNoResponseContent',
        requestBodyContentType: 'application/json',
        requestBodySerializer: serializeReorderShoppingListsRequest,
        requestInformationContentSetMethod: 'setContentFromParsable',
    },
};
/* tslint:enable */
/* eslint-enable */
