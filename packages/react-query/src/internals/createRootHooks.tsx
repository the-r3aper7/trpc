/* eslint-disable @typescript-eslint/no-non-null-assertion */
import {
  DehydratedState,
  QueryClient,
  useInfiniteQuery as __useInfiniteQuery,
  useMutation as __useMutation,
  useQueries as __useQueries,
  useQuery as __useQuery,
  hashQueryKey,
  useQueryClient,
} from '@tanstack/react-query';
import { TRPCClientErrorLike, createTRPCClient } from '@trpc/client';
import type {
  AnyRouter,
  ProcedureRecord,
  inferHandlerInput,
  inferProcedureClientError,
  inferProcedureInput,
  inferProcedureOutput,
  inferSubscriptionOutput,
} from '@trpc/server';
import { inferObservableValue } from '@trpc/server/observable';
import { inferTransformedProcedureOutput } from '@trpc/server/shared';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CreateClient,
  TRPCProvider,
  TRPCQueryOptions,
  UseDehydratedState,
  UseTRPCInfiniteQueryOptions,
  UseTRPCInfiniteQueryResult,
  UseTRPCMutationOptions,
  UseTRPCMutationResult,
  UseTRPCQueryOptions,
  UseTRPCQueryResult,
  UseTRPCSubscriptionOptions,
} from '../shared/hooks/types';
import { createUseQueriesProxy } from '../shared/proxy/useQueriesProxy';
import { CreateTRPCReactOptions, UseMutationOverride } from '../shared/types';
import { SSRState, TRPCContext, TRPCContextState } from './context';
import { QueryType, getArrayQueryKey } from './getArrayQueryKey';
import { getClientArgs } from './getClientArgs';
import { useHookResult } from './useHookResult';
import { TRPCUseQueries } from './useQueries';

type inferInfiniteQueryNames<TObj extends ProcedureRecord> = {
  [TPath in keyof TObj]: inferProcedureInput<TObj[TPath]> extends {
    cursor?: any;
  }
    ? TPath
    : never;
}[keyof TObj];

type inferProcedures<TObj extends ProcedureRecord> = {
  [TPath in keyof TObj]: {
    input: inferProcedureInput<TObj[TPath]>;
    output: inferTransformedProcedureOutput<TObj[TPath]>;
  };
};
/**
 * Create strongly typed react hooks
 * @internal
 */
export function createHooksInternal<
  TRouter extends AnyRouter,
  TSSRContext = unknown,
>(config?: CreateTRPCReactOptions<TRouter>) {
  const mutationSuccessOverride: UseMutationOverride['onSuccess'] =
    config?.unstable_overrides?.useMutation?.onSuccess ??
    ((options) => options.originalFn());

  type TQueries = TRouter['_def']['queries'];
  type TSubscriptions = TRouter['_def']['subscriptions'];

  type TError = TRPCClientErrorLike<TRouter>;
  type TInfiniteQueryNames = inferInfiniteQueryNames<TQueries>;

  type TQueryValues = inferProcedures<TQueries>;

  type ProviderContext = TRPCContextState<TRouter, TSSRContext>;

  const Context = (config?.context ??
    TRPCContext) as React.Context<ProviderContext>;
  const ReactQueryContext = config?.reactQueryContext as React.Context<
    QueryClient | undefined
  >;

  const createClient: CreateClient<TRouter> = (opts) => {
    return createTRPCClient(opts);
  };

  const TRPCProvider: TRPCProvider<TRouter, TSSRContext> = (props) => {
    const { abortOnUnmount = false, client, queryClient, ssrContext } = props;
    const [ssrState, setSSRState] = useState<SSRState>(props.ssrState ?? false);
    useEffect(() => {
      // Only updating state to `mounted` if we are using SSR.
      // This makes it so we don't have an unnecessary re-render when opting out of SSR.
      setSSRState((state) => (state ? 'mounted' : false));
    }, []);
    return (
      <Context.Provider
        value={{
          abortOnUnmount,
          queryClient,
          client,
          ssrContext: ssrContext || null,
          ssrState,
          fetchQuery: useCallback(
            (pathAndInput, opts) => {
              return queryClient.fetchQuery(
                getArrayQueryKey(pathAndInput, 'query'),
                () =>
                  (client as any).query(...getClientArgs(pathAndInput, opts)),
                opts,
              );
            },
            [client, queryClient],
          ),
          fetchInfiniteQuery: useCallback(
            (pathAndInput, opts) => {
              return queryClient.fetchInfiniteQuery(
                getArrayQueryKey(pathAndInput, 'infinite'),
                ({ pageParam }) => {
                  const [path, input] = pathAndInput;
                  const actualInput = { ...(input as any), cursor: pageParam };
                  return (client as any).query(
                    ...getClientArgs([path, actualInput], opts),
                  );
                },
                opts,
              );
            },
            [client, queryClient],
          ),
          prefetchQuery: useCallback(
            (pathAndInput, opts) => {
              return queryClient.prefetchQuery(
                getArrayQueryKey(pathAndInput, 'query'),
                () =>
                  (client as any).query(...getClientArgs(pathAndInput, opts)),
                opts,
              );
            },
            [client, queryClient],
          ),
          prefetchInfiniteQuery: useCallback(
            (pathAndInput, opts) => {
              return queryClient.prefetchInfiniteQuery(
                getArrayQueryKey(pathAndInput, 'infinite'),
                ({ pageParam }) => {
                  const [path, input] = pathAndInput;
                  const actualInput = { ...(input as any), cursor: pageParam };
                  return (client as any).query(
                    ...getClientArgs([path, actualInput], opts),
                  );
                },
                opts,
              );
            },
            [client, queryClient],
          ),
          invalidateQueries: useCallback(
            (...args: any[]) => {
              const [queryKey, ...rest] = args;

              return queryClient.invalidateQueries(
                getArrayQueryKey(queryKey, 'any'),
                ...rest,
              );
            },
            [queryClient],
          ),
          resetQueries: useCallback(
            (...args: any[]) => {
              const [queryKey, ...rest] = args;

              return queryClient.resetQueries(
                getArrayQueryKey(queryKey, 'any'),
                ...rest,
              );
            },
            [queryClient],
          ),
          refetchQueries: useCallback(
            (...args: any[]) => {
              const [queryKey, ...rest] = args;

              return queryClient.refetchQueries(
                getArrayQueryKey(queryKey, 'any'),
                ...rest,
              );
            },
            [queryClient],
          ),
          cancelQuery: useCallback(
            (pathAndInput) => {
              return queryClient.cancelQueries(
                getArrayQueryKey(pathAndInput, 'any'),
              );
            },
            [queryClient],
          ),
          setQueryData: useCallback(
            (...args) => {
              const [queryKey, ...rest] = args;
              return queryClient.setQueryData(
                getArrayQueryKey(queryKey, 'query'),
                ...rest,
              );
            },
            [queryClient],
          ),
          getQueryData: useCallback(
            (...args) => {
              const [queryKey, ...rest] = args;

              return queryClient.getQueryData(
                getArrayQueryKey(queryKey, 'query'),
                ...rest,
              );
            },
            [queryClient],
          ),
          setInfiniteQueryData: useCallback(
            (...args) => {
              const [queryKey, ...rest] = args;

              return queryClient.setQueryData(
                getArrayQueryKey(queryKey, 'infinite'),
                ...rest,
              );
            },
            [queryClient],
          ),
          getInfiniteQueryData: useCallback(
            (...args) => {
              const [queryKey, ...rest] = args;

              return queryClient.getQueryData(
                getArrayQueryKey(queryKey, 'infinite'),
                ...rest,
              );
            },
            [queryClient],
          ),
        }}
      >
        {props.children}
      </Context.Provider>
    );
  };

  function useContext() {
    return React.useContext(Context);
  }

  /**
   * Hack to make sure errors return `status`='error` when doing SSR
   * @link https://github.com/trpc/trpc/pull/1645
   */
  function useSSRQueryOptionsIfNeeded<
    TOptions extends { retryOnMount?: boolean } | undefined,
  >(
    pathAndInput: unknown[],
    type: Exclude<QueryType, 'any'>,
    opts: TOptions,
  ): TOptions {
    const { queryClient, ssrState } = useContext();
    return ssrState &&
      ssrState !== 'mounted' &&
      queryClient.getQueryCache().find(getArrayQueryKey(pathAndInput, type))
        ?.state.status === 'error'
      ? {
          retryOnMount: false,
          ...opts,
        }
      : opts;
  }

  function useQuery(
    // FIXME path should be a tuple
    pathAndInput: [path: string, ...args: unknown[]],
    opts?: UseTRPCQueryOptions<unknown, unknown, unknown, unknown, TError>,
  ): UseTRPCQueryResult<unknown, TError> {
    const { abortOnUnmount, client, ssrState, queryClient, prefetchQuery } =
      useContext();

    if (
      typeof window === 'undefined' &&
      ssrState === 'prepass' &&
      opts?.trpc?.ssr !== false &&
      opts?.enabled !== false &&
      !queryClient.getQueryCache().find(getArrayQueryKey(pathAndInput, 'query'))
    ) {
      void prefetchQuery(pathAndInput as any, opts as any);
    }
    const ssrOpts = useSSRQueryOptionsIfNeeded(pathAndInput, 'query', opts);
    // request option should take priority over global
    const shouldAbortOnUnmount = opts?.trpc?.abortOnUnmount ?? abortOnUnmount;

    const hook = __useQuery(
      getArrayQueryKey(pathAndInput, 'query') as any,
      (queryFunctionContext) => {
        const actualOpts = {
          ...ssrOpts,
          trpc: {
            ...ssrOpts?.trpc,
            ...(shouldAbortOnUnmount
              ? { signal: queryFunctionContext.signal }
              : {}),
          },
        };

        return (client as any).query(
          ...getClientArgs(pathAndInput, actualOpts),
        );
      },
      { context: ReactQueryContext, ...ssrOpts },
    ) as UseTRPCQueryResult<unknown, TError>;
    hook.trpc = useHookResult({
      path: pathAndInput[0],
    });

    return hook;
  }

  function useMutation(
    // FIXME: this should only be a tuple path
    path: string | [string],
    opts?: UseTRPCMutationOptions<unknown, TError, unknown, unknown>,
  ): UseTRPCMutationResult<unknown, TError, unknown, unknown> {
    const { client } = useContext();
    const queryClient = useQueryClient({ context: ReactQueryContext });

    const hook = __useMutation(
      (input) => {
        const actualPath = Array.isArray(path) ? path[0] : path;

        return (client.mutation as any)(
          ...getClientArgs([actualPath, input], opts),
        );
      },
      {
        context: ReactQueryContext,
        ...opts,
        onSuccess(...args) {
          const originalFn = () => opts?.onSuccess?.(...args);

          return mutationSuccessOverride({
            originalFn,
            queryClient,
            meta: opts?.meta ?? {},
          });
        },
      },
    ) as UseTRPCMutationResult<unknown, TError, unknown, unknown>;

    hook.trpc = useHookResult({
      path: Array.isArray(path) ? path[0] : path,
    });

    return hook;
  }

  /* istanbul ignore next */
  /**
   * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️
   *  **Experimental.** API might change without major version bump
   * ⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠️⚠
   */
  function useSubscription<
    TPath extends keyof TSubscriptions & string,
    TOutput extends inferSubscriptionOutput<TRouter, TPath>,
  >(
    pathAndInput: [
      path: TPath,
      ...args: inferHandlerInput<TSubscriptions[TPath]>,
    ],
    opts: UseTRPCSubscriptionOptions<
      inferObservableValue<inferProcedureOutput<TSubscriptions[TPath]>>,
      inferProcedureClientError<TSubscriptions[TPath]>
    >,
  ) {
    const enabled = opts?.enabled ?? true;
    const queryKey = hashQueryKey(pathAndInput);
    const { client } = useContext();

    return useEffect(() => {
      if (!enabled) {
        return;
      }
      const [path, input] = pathAndInput;
      let isStopped = false;
      const subscription = client.subscription<
        TRouter['_def']['subscriptions'],
        TPath,
        TOutput,
        inferProcedureInput<TRouter['_def']['subscriptions'][TPath]>
      >(path, (input ?? undefined) as any, {
        onStarted: () => {
          if (!isStopped) {
            opts.onStarted?.();
          }
        },
        onData: (data) => {
          if (!isStopped) {
            opts.onData(data);
          }
        },
        onError: (err) => {
          if (!isStopped) {
            opts.onError?.(err);
          }
        },
      });
      return () => {
        isStopped = true;
        subscription.unsubscribe();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [queryKey, enabled]);
  }

  function useInfiniteQuery<TPath extends TInfiniteQueryNames & string>(
    pathAndInput: [
      path: TPath,
      input: Omit<TQueryValues[TPath]['input'], 'cursor'>,
    ],
    opts?: UseTRPCInfiniteQueryOptions<
      TPath,
      Omit<TQueryValues[TPath]['input'], 'cursor'>,
      TQueryValues[TPath]['output'],
      TError
    >,
  ): UseTRPCInfiniteQueryResult<TQueryValues[TPath]['output'], TError> {
    const [path, input] = pathAndInput;
    const {
      client,
      ssrState,
      prefetchInfiniteQuery,
      queryClient,
      abortOnUnmount,
    } = useContext();

    if (
      typeof window === 'undefined' &&
      ssrState === 'prepass' &&
      opts?.trpc?.ssr !== false &&
      opts?.enabled !== false &&
      !queryClient
        .getQueryCache()
        .find(getArrayQueryKey(pathAndInput, 'infinite'))
    ) {
      void prefetchInfiniteQuery(pathAndInput as any, opts as any);
    }

    const ssrOpts = useSSRQueryOptionsIfNeeded(pathAndInput, 'infinite', opts);

    // request option should take priority over global
    const shouldAbortOnUnmount = opts?.trpc?.abortOnUnmount ?? abortOnUnmount;

    const hook = __useInfiniteQuery(
      getArrayQueryKey(pathAndInput, 'infinite') as any,
      (queryFunctionContext) => {
        const actualOpts = {
          ...ssrOpts,
          trpc: {
            ...ssrOpts?.trpc,
            ...(shouldAbortOnUnmount
              ? { signal: queryFunctionContext.signal }
              : {}),
          },
        };

        const actualInput = {
          ...((input as any) ?? {}),
          cursor: queryFunctionContext.pageParam,
        };

        return (client as any).query(
          ...getClientArgs([path, actualInput], actualOpts),
        );
      },
      { context: ReactQueryContext, ...ssrOpts },
    ) as UseTRPCInfiniteQueryResult<TQueryValues[TPath]['output'], TError>;

    hook.trpc = useHookResult({
      path,
    });
    return hook;
  }

  const useQueries: TRPCUseQueries<TRouter> = (queriesCallback, context) => {
    const { ssrState, queryClient, prefetchQuery, client } = useContext();

    const proxy = createUseQueriesProxy(client);

    const queries = queriesCallback(proxy);

    if (typeof window === 'undefined' && ssrState === 'prepass') {
      for (const query of queries) {
        const queryOption = query as TRPCQueryOptions<any, any, any, any>;
        if (
          queryOption.trpc?.ssr !== false &&
          !queryClient
            .getQueryCache()
            .find(getArrayQueryKey(queryOption.queryKey!, 'query'))
        ) {
          void prefetchQuery(queryOption.queryKey as any, queryOption as any);
        }
      }
    }

    return __useQueries({
      queries: queries.map((query) => ({
        ...query,
        queryKey: getArrayQueryKey(query.queryKey, 'query'),
      })),
      context,
    }) as any;
  };

  const useDehydratedState: UseDehydratedState<TRouter> = (
    client,
    trpcState,
  ) => {
    const transformed: DehydratedState | undefined = useMemo(() => {
      if (!trpcState) {
        return trpcState;
      }

      return client.runtime.transformer.deserialize(trpcState);
    }, [trpcState, client]);
    return transformed;
  };

  return {
    Provider: TRPCProvider,
    createClient,
    useContext,
    useQuery,
    useQueries,
    useMutation,
    useSubscription,
    useDehydratedState,
    useInfiniteQuery,
  };
}

/**
 * Hack to infer the type of `createReactQueryHooks`
 * @link https://stackoverflow.com/a/59072991
 */
class GnClass<TRouter extends AnyRouter, TSSRContext = unknown> {
  fn() {
    return createHooksInternal<TRouter, TSSRContext>();
  }
}

type returnTypeInferer<TType> = TType extends (
  a: Record<string, string>,
) => infer U
  ? U
  : never;
type fooType<TRouter extends AnyRouter, TSSRContext = unknown> = GnClass<
  TRouter,
  TSSRContext
>['fn'];

/**
 * Infer the type of a `createReactQueryHooks` function
 * @internal
 */
export type CreateReactQueryHooks<
  TRouter extends AnyRouter,
  TSSRContext = unknown,
> = returnTypeInferer<fooType<TRouter, TSSRContext>>;