from rest_framework.pagination import PageNumberPagination


class StandardPagination(PageNumberPagination):
    """
    Page-number pagination that actually honours `?page_size=`.

    DRF's PageNumberPagination ignores that parameter unless
    `page_size_query_param` is set, which it is not by default. Every admin
    dashboard list asked for a page size (10, 12 or 15 depending on the
    screen), silently received 20, and then computed its page count as
    `Math.ceil(count / requested_size)` - so it offered more pages than
    existed and the last ones returned 404 "Invalid page".

    `max_page_size` keeps a caller from asking for the whole table in one
    request and turning a list endpoint into an accidental export.
    """

    page_size_query_param = 'page_size'
    max_page_size = 100
