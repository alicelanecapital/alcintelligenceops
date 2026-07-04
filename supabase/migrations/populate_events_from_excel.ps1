$excel = New-Object -ComObject Excel.Application
$workbook = $excel.Workbooks.Open("C:\Users\Georgia Adams\Downloads\AfricaEventPlanner2026.xls.xlsx")
$sheet = $workbook.Sheets.Item(1)

$cells = $sheet.UsedRange
$sql = ""

for($r = 2; $r -le [Math]::Min(100, $cells.Rows.Count); $r++) {
    $name = $cells.Item($r, 1).Value2
    if ([string]::IsNullOrWhiteSpace($name)) { continue }

    $venue = $cells.Item($r, 2).Value2
    $cost = $cells.Item($r, 6).Value2
    $start = $cells.Item($r, 7).Value2
    $end = $cells.Item($r, 8).Value2
    $opportunity = $cells.Item($r, 9).Value2
    $strategic_value = $cells.Item($r, 10).Value2
    $score_cost = $cells.Item($r, 11).Value2
    $score_deal_flow = $cells.Item($r, 12).Value2
    $score_investor = $cells.Item($r, 13).Value2
    $score_partnerships = $cells.Item($r, 14).Value2
    $score_government = $cells.Item($r, 15).Value2
    $score_market = $cells.Item($r, 16).Value2
    $score_industry = $cells.Item($r, 17).Value2
    $score_brand = $cells.Item($r, 18).Value2
    $score_learning = $cells.Item($r, 19).Value2
    $score_long_term = $cells.Item($r, 20).Value2
    $total_score = $cells.Item($r, 21).Value2
    $status = $cells.Item($r, 23).Value2

    if ($null -ne $start) {
        $startDate = ([datetime]::FromOADate($start)).ToString("yyyy-MM-dd")
    }
    if ($null -ne $end) {
        $endDate = ([datetime]::FromOADate($end)).ToString("yyyy-MM-dd")
    }

    $nameSafe = $name -replace "'", "''"
    $venueSafe = $venue -replace "'", "''"
    $opportunitySafe = $opportunity -replace "'", "''"
    $strategySafe = $strategic_value -replace "'", "''"

    $sql += "UPDATE events SET description='$strategySafe', who_you_meet='$opportunitySafe', score_cost=$score_cost, score_deal_flow=$score_deal_flow, score_investor_access=$score_investor, score_strategic_partnerships=$score_partnerships, score_government_access=$score_government, score_market_intelligence=$score_market, score_industry_insights=$score_industry, score_brand_visibility=$score_brand, score_learning_development=$score_learning, score_long_term_opportunity=$score_long_term, total_score=$total_score WHERE name='$nameSafe';"
    $sql += "`n"
}

$sql | Out-File "C:\Users\Georgia Adams\Projects\alcintelligenceops\supabase\migrations\populate_events.sql"
Write-Host "SQL generated to populate_events.sql"
$excel.Quit()
