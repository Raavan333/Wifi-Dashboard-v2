DASHBOARD_SUMMARY = "dashboard:summary"
DASHBOARD_POPULATION = "dashboard:population"
DASHBOARD_CONNECTIVITY = "dashboard:connectivity"
DASHBOARD_SSID = "dashboard:ssid"
DASHBOARD_LOCATION = "dashboard:location"
DASHBOARD_ACTIVITY = "dashboard:activity"
DASHBOARD_DATA_QUALITY = "dashboard:data_quality"
DASHBOARD_AP = "dashboard:ap"
DASHBOARD_FULL = "dashboard:full"

INVESTIGATE_OPTIONS = "investigate:options"


def dashboard_inactive_users_key(page: int, page_size: int) -> str:
    return f"dashboard:inactive_users:p{page}:s{page_size}"


def dashboard_rare_users_key(page: int, page_size: int) -> str:
    return f"dashboard:rare_users:p{page}:s{page_size}"
