import { useMemo } from 'react';
import { useInfiniteQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuth } from '../auth/authContext';
import { exportMetricsCsv, getMetrics, type Period } from '../api/metricsApi';
import { downloadBlob } from '../components/shared/utils/format';

interface Params {
  period: Period;
  service: string;
}

export const METRICS_PAGE_SIZE = 50;

export default function useMetrics({ period, service }: Params) {
  //we get the http request func to use it later
  const { apiFetch } = useAuth();

  //useInfiniteQuery take instructions for loading 
  // one page from api then fetches and caches the data tracks whether it’s loading or failed and loads the next page when you click Load more
  const metricsQuery = useInfiniteQuery({
    //the cache name: every input that changes the request is in it, so a change means a new fetch
    queryKey: ['metrics', period, service],
    //how do we want to return a page
    //Receives pageParam: undefined for the first page a timestamp for the next ones.
    //React Query then saves that page under the queryKey, and passes it to getNextPageParam to get the bookmark for the next one.
    queryFn: ({ pageParam }) =>
      getMetrics(apiFetch, {
        period,
        service: service || undefined,
        count: METRICS_PAGE_SIZE,
        before: pageParam,
      }),
    //what 'before' do I use for the first page
    //undefined as string now undifined later string
    initialPageParam: undefined as string | undefined,
    //always get called after getting a page and passes the last page that arrvied as last page
    //lastPage the page that just arrived get passed 
    getNextPageParam: (lastPage) =>
      //if hasMore is true we take the last metric point keep its timestamp a and on Load more ask the backend for the points older than it.
      lastPage.hasMore ? lastPage.data.at(-1)?.timestamp : undefined,
    //don't refetch when we come back to the tab
    refetchOnWindowFocus: false,
    //if a request fails stop
    retry: false,
  });

  //useMutation does an action when triggered
  const exportMutation = useMutation({
    mutationFn: () =>
      exportMetricsCsv(apiFetch, { period, service: service || undefined }),
    //useMutation pass the returned blob to onSuccess
    onSuccess: (blob) => downloadBlob(blob, `vigil-metrics-${period}.csv`),
    //if export fails throw the error we did in exportMetricsCsv toast shows a red popup with our message
    onError: (error) => toast.error(error.message),
  });

  //useMemo remembers the result of a calculation and only recalculates when one of its inputs changes
  //first argument func that calculates, second arg list of inputs on each render usememo check of these inputs are the same or changed to do a recalculation
  const metrics = useMemo(
    //metricsQuery the object that have the pages we retuened back in useInfiniteQuery
    //flatMap join the pages together
    () => metricsQuery.data?.pages.flatMap((page) => page.data) ?? [],
    [metricsQuery.data],
  );

  return {
    metrics,
    //is loading yes or no same for isFetchingNextPage isPending
    isLoading: metricsQuery.isLoading,
    error: metricsQuery.error,
    hasNextPage: metricsQuery.hasNextPage,
    fetchNextPage: metricsQuery.fetchNextPage,
    isFetchingNextPage: metricsQuery.isFetchingNextPage,
    exportCsv: exportMutation.mutate,
    isExporting: exportMutation.isPending,
  };
}
