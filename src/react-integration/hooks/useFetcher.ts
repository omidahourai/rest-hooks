import { useContext, useRef, useCallback } from 'react';

import { FetchAction, UpdateFunction } from '~/types';
import {
  FetchShape,
  DeleteShape,
  Schema,
  isDeleteShape,
  SchemaFromShape,
  ParamsFromShape,
  BodyFromShape,
} from '~/resource';
import { DispatchContext } from '~/react-integration/context';

const SHAPE_TYPE_TO_RESPONSE_TYPE: Record<
  FetchShape<any, any, any>['type'],
  'rest-hooks/receive' | 'rest-hooks/rpc' | 'rest-hooks/purge'
> = {
  read: 'rest-hooks/receive',
  mutate: 'rest-hooks/rpc',
  delete: 'rest-hooks/purge',
};

type OptimisticUpdateParams<
  SourceSchema extends Schema,
  DestShape extends FetchShape<any, any, any>
> = [
  DestShape,
  ParamsFromShape<DestShape>,
  UpdateFunction<SourceSchema, SchemaFromShape<DestShape>>,
];

/** Build an imperative dispatcher to issue network requests. */
export default function useFetcher<
  Shape extends FetchShape<
    Schema,
    Readonly<object>,
    Readonly<object | string> | void
  >
>(
  fetchShape: Shape,
  throttle = false,
): Shape extends DeleteShape<any, any, any>
  ? (params: ParamsFromShape<Shape>, body: BodyFromShape<Shape>) => Promise<any>
  : <
      UpdateParams extends OptimisticUpdateParams<
        SchemaFromShape<Shape>,
        FetchShape<any, any, any>
      >[]
    >(
      params: ParamsFromShape<Shape>,
      body: BodyFromShape<Shape>,
      updateParams?: UpdateParams | undefined,
    ) => Promise<any> {
  const dispatch = useContext(DispatchContext);

  // we just want the current values when we dispatch, so
  // box the shape in a ref to make react-hooks/exhaustive-deps happy
  const shapeRef = useRef(fetchShape);
  shapeRef.current = fetchShape;

  const fetchDispatcher = useCallback(
    (
      params: ParamsFromShape<Shape>,
      body: BodyFromShape<Shape>,
      updateParams?:
        | OptimisticUpdateParams<
            SchemaFromShape<Shape>,
            FetchShape<any, any, any>
          >[]
        | undefined,
    ) => {
      const { fetch, schema, type, getFetchKey, options } = shapeRef.current;
      const responseType = SHAPE_TYPE_TO_RESPONSE_TYPE[type];

      const key = getFetchKey(params);
      const identifier = isDeleteShape(shapeRef.current)
        ? shapeRef.current.schema.getId(params)
        : key;
      let resolve: (value?: any | PromiseLike<any>) => void = 0 as any;
      let reject: (reason?: any) => void = 0 as any;
      const promise = new Promise<any>((a, b) => {
        [resolve, reject] = [a, b];
      });
      const meta: FetchAction['meta'] = {
        schema,
        responseType,
        url: identifier,
        throttle,
        options,
        resolve,
        reject,
      };

      if (updateParams) {
        meta.updaters = updateParams.reduce(
          (accumulator: object, [toShape, toParams, updateFn]) => ({
            [toShape.getFetchKey(toParams)]: updateFn,
            ...accumulator,
          }),
          {},
        );
      }

      dispatch({
        type: 'rest-hooks/fetch',
        payload: () => fetch(params, body),
        meta,
      });
      return promise;
    },
    [dispatch, throttle],
  );
  // any is due to the ternary that we don't want to deal with in our implementation
  return fetchDispatcher as any;
}
