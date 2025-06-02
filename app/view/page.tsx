"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useToast } from "@/hooks/use-toast"
import {
  Search,
  Filter,
  Download,
  BarChart3,
  Users,
  MapPin,
  User,
  Syringe,
  AlertTriangle,
  Calendar,
  TrendingUp,
} from "lucide-react"

export default function ViewPage() {
  const { toast } = useToast()
  const supabase = getSupabaseBrowser()
  const [xAxis, setXAxis] = useState("")
  const [yAxis, setYAxis] = useState("none")
  const [selectedYear, setSelectedYear] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [summary, setSummary] = useState<any>({})

  const axisOptions = [
    { value: "community", label: "Communities", icon: Users },
    { value: "village", label: "Villages", icon: MapPin },
    { value: "beneficiary", label: "Beneficiaries", icon: User },
    { value: "vaccination", label: "Vaccination Records", icon: Syringe },
    { value: "disease", label: "Disease Records", icon: AlertTriangle },
    { value: "predation", label: "Predation Records", icon: AlertTriangle },
    { value: "ech_worker", label: "ECH Workers", icon: User },
  ]

  // Dynamic Y-axis options based on X-axis selection
  const getYAxisOptions = () => {
    const baseOptions = [{ value: "none", label: "None (Simple List)" }]

    switch (xAxis) {
      case "community":
        return [
          ...baseOptions,
          { value: "country", label: "Group by Country" },
          { value: "province", label: "Group by Province" },
          { value: "district", label: "Group by District" },
          { value: "protection_status", label: "Group by Protection Status" },
        ]
      case "village":
        return [
          ...baseOptions,
          { value: "community", label: "Group by Community" },
          { value: "population_range", label: "Group by Population Range" },
        ]
      case "beneficiary":
        return [
          ...baseOptions,
          { value: "village", label: "Group by Village" },
          { value: "community", label: "Group by Community" },
        ]
      case "vaccination":
      case "disease":
      case "predation":
        return [
          ...baseOptions,
          { value: "year", label: "Group by Year" },
          { value: "season", label: "Group by Season" },
          { value: "community", label: "Group by Community" },
          { value: "village", label: "Group by Village" },
          { value: "ech_worker", label: "Group by ECH Worker" },
        ]
      case "ech_worker":
        return [
          ...baseOptions,
          { value: "education", label: "Group by Education Level" },
          { value: "status", label: "Group by Employment Status" },
        ]
      default:
        return baseOptions
    }
  }

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)

  useEffect(() => {
    if (xAxis) {
      fetchData()
    }
  }, [xAxis, yAxis, selectedYear])

  // Reset Y-axis when X-axis changes
  useEffect(() => {
    setYAxis("none")
  }, [xAxis])

  const fetchData = async () => {
    if (!xAxis) return

    setLoading(true)
    try {
      const query = buildQuery()
      const { data: result, error } = await query

      if (error) throw error

      const processedData = processData(result || [])
      setData(processedData)
      generateSummary(processedData)
    } catch (error) {
      console.error("Error fetching data:", error)
      toast({ title: "Error", description: "Failed to fetch data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const buildQuery = () => {
    let baseQuery = supabase.from(getTableName(xAxis))

    switch (xAxis) {
      case "community":
        baseQuery = baseQuery.select(`
          cname,
          alias,
          country,
          province,
          district,
          area,
          forestarea,
          pastureland,
          protection_status,
          gpslat,
          gpslong
        `)
        break

      case "village":
        baseQuery = baseQuery.select(`
          villageid,
          villagename,
          population,
          area,
          gpslat,
          gpslong,
          community:cname(cname, country, province, district)
        `)
        break

      case "beneficiary":
        baseQuery = baseQuery.select(`
          bid,
          bname,
          fathername,
          village:villageid(
            villagename,
            community:cname(cname)
          )
        `)
        break

      case "vaccination":
        baseQuery = baseQuery.select(`
          rid,
          vyear,
          season,
          vdate,
          donor,
          banimalslaughtered,
          sanimalslaughtered,
          sheepsold,
          cattlesold,
          goatsold,
          persoldanimalcost,
          beneficiary:bid(
            bname,
            village:villageid(
              villagename,
              community:cname(cname)
            )
          ),
          ech_worker:echid(name),
          vrecord(vaccinationtype, vsheep, vgoat, vcattle, vdozoo_yak, vothers)
        `)
        break

      case "disease":
        baseQuery = baseQuery.select(`
          diseaseid,
          diseasetype,
          dsheep,
          dgoat,
          dcattle,
          ddozoo_yak,
          dothers,
          vaccination_record:rid(
            vyear,
            season,
            vdate,
            beneficiary:bid(
              bname,
              village:villageid(
                villagename,
                community:cname(cname)
              )
            ),
            ech_worker:echid(name)
          ),
          disease_record_symptoms(symptom)
        `)
        break

      case "predation":
        baseQuery = baseQuery.select(`
          predationid,
          predatortype,
          psheep,
          pgoat,
          pcattle,
          pdozoo_yak,
          pothers,
          perpreyanimalcost,
          vaccination_record:rid(
            vyear,
            season,
            vdate,
            beneficiary:bid(
              bname,
              village:villageid(
                villagename,
                community:cname(cname)
              )
            ),
            ech_worker:echid(name)
          )
        `)
        break

      case "ech_worker":
        baseQuery = baseQuery.select(`
          echid,
          name,
          joiningdate,
          departuredate,
          highesteducation,
          phonenumber,
          address
        `)
        break
    }

    // Apply year filter for relevant tables
    if (selectedYear && selectedYear !== "all") {
      if (xAxis === "vaccination") {
        baseQuery = baseQuery.eq("vyear", Number.parseInt(selectedYear))
      } else if (xAxis === "disease" || xAxis === "predation") {
        baseQuery = baseQuery.eq("vaccination_record.vyear", Number.parseInt(selectedYear))
      }
    }

    return baseQuery.order(getOrderField(xAxis))
  }

  const getTableName = (axis: string) => {
    const tableMap = {
      community: "community",
      village: "village",
      beneficiary: "beneficiary",
      vaccination: "vaccination_record",
      disease: "disease_record",
      predation: "predation_record",
      ech_worker: "ech_worker",
    }
    return tableMap[axis as keyof typeof tableMap] || "community"
  }

  const getOrderField = (axis: string) => {
    const orderMap = {
      community: "cname",
      village: "villagename",
      beneficiary: "bname",
      vaccination: "vdate",
      disease: "diseasetype",
      predation: "predatortype",
      ech_worker: "name",
    }
    return orderMap[axis as keyof typeof orderMap] || "id"
  }

  const processData = (rawData: any[]) => {
    if (yAxis === "none") {
      return rawData
    }

    // Group data based on Y-axis selection
    const grouped = rawData.reduce(
      (acc, item) => {
        let groupKey = ""

        switch (yAxis) {
          case "year":
            groupKey = item.vyear || item.vaccination_record?.vyear || "Unknown"
            break
          case "season":
            groupKey = item.season || item.vaccination_record?.season || "Unknown"
            break
          case "community":
            groupKey =
              item.cname ||
              item.community?.cname ||
              item.village?.community?.cname ||
              item.beneficiary?.village?.community?.cname ||
              item.vaccination_record?.beneficiary?.village?.community?.cname ||
              "Unknown"
            break
          case "village":
            groupKey =
              item.villagename ||
              item.village?.villagename ||
              item.beneficiary?.village?.villagename ||
              item.vaccination_record?.beneficiary?.village?.villagename ||
              "Unknown"
            break
          case "ech_worker":
            groupKey = item.ech_worker?.name || item.vaccination_record?.ech_worker?.name || "Unknown"
            break
          case "country":
            groupKey = item.country || "Unknown"
            break
          case "province":
            groupKey = item.province || "Unknown"
            break
          case "district":
            groupKey = item.district || "Unknown"
            break
          case "protection_status":
            groupKey = item.protection_status || "Unknown"
            break
          case "education":
            groupKey = item.highesteducation || "Unknown"
            break
          case "status":
            groupKey = item.departuredate ? "Former" : "Active"
            break
          case "population_range":
            const pop = item.population || 0
            if (pop === 0) groupKey = "Unknown"
            else if (pop < 100) groupKey = "Small (< 100)"
            else if (pop < 500) groupKey = "Medium (100-500)"
            else if (pop < 1000) groupKey = "Large (500-1000)"
            else groupKey = "Very Large (1000+)"
            break
          default:
            groupKey = "All"
        }

        if (!acc[groupKey]) {
          acc[groupKey] = []
        }
        acc[groupKey].push(item)
        return acc
      },
      {} as Record<string, any[]>,
    )

    return Object.entries(grouped).map(([key, items]) => ({
      groupKey: key,
      items,
      count: items.length,
    }))
  }

  const generateSummary = (processedData: any[]) => {
    const summary: any = {
      totalRecords: 0,
      totalAnimals: 0,
      totalVaccinations: 0,
      totalDiseases: 0,
      totalPredations: 0,
      totalCost: 0,
    }

    if (yAxis === "none") {
      summary.totalRecords = processedData.length

      processedData.forEach((item) => {
        // Count animals and costs based on data type
        if (xAxis === "vaccination") {
          summary.totalVaccinations += 1
          if (item.vrecord) {
            item.vrecord.forEach((v: any) => {
              summary.totalAnimals +=
                (v.vsheep || 0) + (v.vgoat || 0) + (v.vcattle || 0) + (v.vdozoo_yak || 0) + (v.vothers || 0)
            })
          }
          summary.totalCost +=
            (item.persoldanimalcost || 0) * ((item.sheepsold || 0) + (item.cattlesold || 0) + (item.goatsold || 0))
        }
        if (xAxis === "disease") {
          summary.totalDiseases += 1
          summary.totalAnimals +=
            (item.dsheep || 0) + (item.dgoat || 0) + (item.dcattle || 0) + (item.ddozoo_yak || 0) + (item.dothers || 0)
        }
        if (xAxis === "predation") {
          summary.totalPredations += 1
          const animalsLost =
            (item.psheep || 0) + (item.pgoat || 0) + (item.pcattle || 0) + (item.pdozoo_yak || 0) + (item.pothers || 0)
          summary.totalAnimals += animalsLost
          summary.totalCost += animalsLost * (item.perpreyanimalcost || 0)
        }
        if (xAxis === "village") {
          summary.totalAnimals += item.population || 0 // Population in this case
        }
        if (xAxis === "community") {
          summary.totalCost += item.area || 0 // Total area in this case
        }
      })
    } else {
      summary.totalRecords = processedData.reduce((sum, group) => sum + group.count, 0)
      summary.groups = processedData.length
    }

    setSummary(summary)
  }

  const filteredData = data.filter((item) => {
    if (!searchTerm) return true

    const searchLower = searchTerm.toLowerCase()

    if (yAxis === "none") {
      return Object.values(item).some((value) => {
        if (typeof value === "object" && value !== null) {
          return Object.values(value).some((subValue) => subValue?.toString().toLowerCase().includes(searchLower))
        }
        return value?.toString().toLowerCase().includes(searchLower)
      })
    } else {
      return (
        item.groupKey.toLowerCase().includes(searchLower) ||
        item.items.some((subItem: any) =>
          Object.values(subItem).some((value) => {
            if (typeof value === "object" && value !== null) {
              return Object.values(value).some((subValue) => subValue?.toString().toLowerCase().includes(searchLower))
            }
            return value?.toString().toLowerCase().includes(searchLower)
          }),
        )
      )
    }
  })

  const renderSummaryCards = () => {
    const selectedOption = axisOptions.find((opt) => opt.value === xAxis)
    const IconComponent = selectedOption?.icon || BarChart3

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Records</p>
                <p className="text-2xl font-bold text-gray-900">{summary.totalRecords || 0}</p>
              </div>
              <IconComponent className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        {yAxis !== "none" && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Groups</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.groups || 0}</p>
                </div>
                <Filter className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        )}

        {(xAxis === "vaccination" || xAxis === "disease" || xAxis === "predation" || xAxis === "village") && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {xAxis === "village" ? "Total Population" : "Animals Affected"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalAnimals || 0}</p>
                </div>
                {xAxis === "vaccination" ? (
                  <Syringe className="h-8 w-8 text-gray-600" />
                ) : xAxis === "village" ? (
                  <Users className="h-8 w-8 text-gray-600" />
                ) : (
                  <AlertTriangle className="h-8 w-8 text-gray-600" />
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {(xAxis === "vaccination" || xAxis === "predation" || xAxis === "community") && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    {xAxis === "community" ? "Total Area (sq km)" : "Total Value"}
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {xAxis === "community"
                      ? (summary.totalCost || 0).toFixed(2)
                      : `$${(summary.totalCost || 0).toFixed(2)}`}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  const renderTable = () => {
    if (!filteredData.length) {
      return (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500 text-lg">No data found</p>
          <p className="text-gray-400">Try adjusting your filters or search terms</p>
        </div>
      )
    }

    if (yAxis === "none") {
      return renderSimpleTable()
    } else {
      return renderGroupedTable()
    }
  }

  const renderSimpleTable = () => {
    const headers = getTableHeaders()

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              {headers.map((header) => (
                <TableHead key={header.key} className="font-semibold text-gray-700">
                  {header.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow key={index} className="hover:bg-gray-50">
                {headers.map((header) => (
                  <TableCell key={header.key}>{formatCellValue(row, header.key, header.type)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  const renderGroupedTable = () => {
    return (
      <div className="space-y-6">
        {filteredData.map((group, groupIndex) => (
          <Card key={groupIndex} className="shadow-sm border-gray-200">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center justify-between">
                <span className="text-lg font-semibold text-gray-800">{group.groupKey}</span>
                <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                  {group.count} records
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-25">
                      {getTableHeaders().map((header) => (
                        <TableHead key={header.key} className="font-medium text-gray-600 text-sm">
                          {header.label}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.items.map((item: any, itemIndex: number) => (
                      <TableRow key={itemIndex} className="hover:bg-gray-25">
                        {getTableHeaders().map((header) => (
                          <TableCell key={header.key} className="text-sm">
                            {formatCellValue(item, header.key, header.type)}
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const getTableHeaders = () => {
    const headerMap = {
      community: [
        { key: "cname", label: "Community Name", type: "text" },
        { key: "alias", label: "Alias", type: "text" },
        { key: "country", label: "Country", type: "text" },
        { key: "province", label: "Province", type: "text" },
        { key: "district", label: "District", type: "text" },
        { key: "area", label: "Total Area (sq km)", type: "number" },
        { key: "forestarea", label: "Forest Area (sq km)", type: "number" },
        { key: "pastureland", label: "Pasture Land (sq km)", type: "number" },
        { key: "protection_status", label: "Protection Status", type: "text" },
      ],
      village: [
        { key: "villagename", label: "Village Name", type: "text" },
        { key: "community_name", label: "Community", type: "nested" },
        { key: "population", label: "Population", type: "number" },
        { key: "area", label: "Area (sq km)", type: "number" },
        { key: "gpslat", label: "GPS Latitude", type: "number" },
        { key: "gpslong", label: "GPS Longitude", type: "number" },
      ],
      beneficiary: [
        { key: "bname", label: "Beneficiary Name", type: "text" },
        { key: "fathername", label: "Father Name", type: "text" },
        { key: "village_name", label: "Village", type: "nested" },
        { key: "community_name", label: "Community", type: "nested" },
      ],
      vaccination: [
        { key: "vyear", label: "Year", type: "number" },
        { key: "season", label: "Season", type: "text" },
        { key: "vdate", label: "Date", type: "date" },
        { key: "beneficiary_name", label: "Beneficiary", type: "nested" },
        { key: "village_name", label: "Village", type: "nested" },
        { key: "ech_worker_name", label: "ECH Worker", type: "nested" },
        { key: "donor", label: "Donor", type: "text" },
        { key: "vaccination_summary", label: "Vaccinations", type: "vaccination_summary" },
        { key: "sales_summary", label: "Sales", type: "sales_summary" },
      ],
      disease: [
        { key: "diseasetype", label: "Disease Type", type: "text" },
        { key: "vyear", label: "Year", type: "nested" },
        { key: "season", label: "Season", type: "nested" },
        { key: "beneficiary_name", label: "Beneficiary", type: "nested" },
        { key: "village_name", label: "Village", type: "nested" },
        { key: "ech_worker_name", label: "ECH Worker", type: "nested" },
        { key: "animal_summary", label: "Animals Affected", type: "animal_summary" },
        { key: "symptoms", label: "Symptoms", type: "symptoms" },
      ],
      predation: [
        { key: "predatortype", label: "Predator Type", type: "text" },
        { key: "vyear", label: "Year", type: "nested" },
        { key: "season", label: "Season", type: "nested" },
        { key: "beneficiary_name", label: "Beneficiary", type: "nested" },
        { key: "village_name", label: "Village", type: "nested" },
        { key: "ech_worker_name", label: "ECH Worker", type: "nested" },
        { key: "animal_summary", label: "Animals Lost", type: "animal_summary" },
        { key: "perpreyanimalcost", label: "Cost per Animal", type: "currency" },
        { key: "total_loss", label: "Total Loss", type: "calculated_currency" },
      ],
      ech_worker: [
        { key: "echid", label: "ECH ID", type: "number" },
        { key: "name", label: "Name", type: "text" },
        { key: "highesteducation", label: "Education", type: "text" },
        { key: "joiningdate", label: "Joining Date", type: "date" },
        { key: "departuredate", label: "Departure Date", type: "date" },
        { key: "phonenumber", label: "Phone", type: "text" },
        { key: "address", label: "Address", type: "text" },
        { key: "status", label: "Status", type: "employment_status" },
      ],
    }

    return headerMap[xAxis as keyof typeof headerMap] || []
  }

  const formatCellValue = (item: any, key: string, type: string) => {
    if (item === null || item === undefined) return "-"

    switch (type) {
      case "date":
        const value = item[key]
        return value ? new Date(value).toLocaleDateString() : "-"

      case "currency":
        const currValue = item[key]
        return currValue ? `$${Number.parseFloat(currValue).toFixed(2)}` : "-"

      case "number":
        const numValue = item[key]
        return numValue ? numValue.toLocaleString() : "-"

      case "nested":
        switch (key) {
          case "community_name":
            return (
              item.community?.cname ||
              item.village?.community?.cname ||
              item.beneficiary?.village?.community?.cname ||
              item.vaccination_record?.beneficiary?.village?.community?.cname ||
              "-"
            )
          case "village_name":
            return (
              item.village?.villagename ||
              item.beneficiary?.village?.villagename ||
              item.vaccination_record?.beneficiary?.village?.villagename ||
              "-"
            )
          case "beneficiary_name":
            return item.beneficiary?.bname || item.vaccination_record?.beneficiary?.bname || "-"
          case "ech_worker_name":
            return item.ech_worker?.name || item.vaccination_record?.ech_worker?.name || "-"
          case "vyear":
            return item.vaccination_record?.vyear || "-"
          case "season":
            return item.vaccination_record?.season || "-"
          default:
            return "-"
        }

      case "vaccination_summary":
        if (!item.vrecord || !Array.isArray(item.vrecord)) return "-"
        return item.vrecord
          .map(
            (v: any) =>
              `${v.vaccinationtype}: ${(v.vsheep || 0) + (v.vgoat || 0) + (v.vcattle || 0) + (v.vdozoo_yak || 0) + (v.vothers || 0)} animals`,
          )
          .join("; ")

      case "sales_summary":
        const sheep = item.sheepsold || 0
        const cattle = item.cattlesold || 0
        const goat = item.goatsold || 0
        const total = sheep + cattle + goat
        return total > 0 ? `${total} animals (${sheep} sheep, ${cattle} cattle, ${goat} goats)` : "-"

      case "animal_summary":
        const dsheep = item.dsheep || item.psheep || 0
        const dgoat = item.dgoat || item.pgoat || 0
        const dcattle = item.dcattle || item.pcattle || 0
        const ddozoo = item.ddozoo_yak || item.pdozoo_yak || 0
        const dothers = item.dothers || item.pothers || 0
        const totalAnimals = dsheep + dgoat + dcattle + ddozoo + dothers
        return totalAnimals > 0
          ? `${totalAnimals} total (${dsheep} sheep, ${dgoat} goats, ${dcattle} cattle, ${ddozoo} dozoo/yak, ${dothers} others)`
          : "-"

      case "symptoms":
        if (!item.disease_record_symptoms || !Array.isArray(item.disease_record_symptoms)) return "-"
        return item.disease_record_symptoms.map((s: any) => s.symptom).join(", ")

      case "calculated_currency":
        if (key === "total_loss") {
          const animals =
            (item.psheep || 0) + (item.pgoat || 0) + (item.pcattle || 0) + (item.pdozoo_yak || 0) + (item.pothers || 0)
          const cost = item.perpreyanimalcost || 0
          return animals > 0 && cost > 0 ? `$${(animals * cost).toFixed(2)}` : "-"
        }
        return "-"

      case "employment_status":
        return item.departuredate ? "Former" : "Active"

      default:
        const defaultValue = item[key]
        return defaultValue?.toString() || "-"
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Analytics Dashboard</h1>
          <p className="text-gray-600">Analyze and explore your Snow Leopard Foundation data with detailed insights</p>
        </div>

        {/* Filter Controls */}
        <Card className="shadow-sm border-gray-200 mb-8">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center space-x-2 text-gray-800">
              <Filter className="h-5 w-5" />
              <span>Data Filters & Controls</span>
            </CardTitle>
            <CardDescription>Configure your data view and analysis parameters</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Primary Data (X-Axis)</Label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger className="border-gray-300 focus:border-gray-500">
                    <SelectValue placeholder="Select primary data" />
                  </SelectTrigger>
                  <SelectContent>
                    {axisOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value || "default"}>
                        <div className="flex items-center space-x-2">
                          <option.icon className="h-4 w-4 text-gray-600" />
                          <span>{option.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Grouping (Y-Axis)</Label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger className="border-gray-300 focus:border-gray-500">
                    <SelectValue placeholder="Select grouping" />
                  </SelectTrigger>
                  <SelectContent>
                    {getYAxisOptions().map((option) => (
                      <SelectItem key={option.value} value={option.value || "default"}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Year Filter</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="border-gray-300 focus:border-gray-500">
                    <SelectValue placeholder="All years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All years</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString() || "default"}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search data..."
                    className="pl-10 border-gray-300 focus:border-gray-500"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <Button
                  onClick={fetchData}
                  disabled={!xAxis || loading}
                  className="w-full bg-gray-800 hover:bg-gray-900 text-white"
                >
                  {loading ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="h-4 w-4" />
                      <span>Generate View</span>
                    </div>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        {data.length > 0 && renderSummaryCards()}

        {/* Data Table */}
        <Card className="shadow-sm border-gray-200">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="flex items-center justify-between text-gray-800">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-5 w-5" />
                <span>Data Results</span>
              </div>
              <div className="flex items-center space-x-2">
                {selectedYear && selectedYear !== "all" && (
                  <Badge variant="secondary" className="bg-gray-100 text-gray-800">
                    <Calendar className="h-3 w-3 mr-1" />
                    {selectedYear}
                  </Badge>
                )}
                <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            </CardTitle>
            <CardDescription>
              {xAxis && `Showing ${axisOptions.find((opt) => opt.value === xAxis)?.label || xAxis} data`}
              {yAxis &&
                yAxis !== "none" &&
                ` grouped by ${getYAxisOptions().find((opt) => opt.value === yAxis)?.label || yAxis}`}
              {filteredData.length > 0 && ` (${filteredData.length} ${yAxis === "none" ? "records" : "groups"})`}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">{renderTable()}</CardContent>
        </Card>
      </div>
    </div>
  )
}
