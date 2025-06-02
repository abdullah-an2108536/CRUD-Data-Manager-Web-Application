"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Textarea } from "@/components/ui/textarea"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { useToast } from "@/hooks/use-toast"
import {
  Shield,
  Trash2,
  Users,
  MapPin,
  UserPlus,
  Key,
  AlertTriangle,
  CheckCircle,
  XCircle,
  GraduationCap,
  Plus,
  Eye,
  Award,
  Clock,
  Search,
  User,
} from "lucide-react"

interface EchWorker {
  echid: number
  name: string
  fathername?: string
  username: string
  nationalid: string
  joiningdate: string
  departuredate?: string
  highesteducation?: string
  phonenumber?: string
  address?: string
  villages: any[]
  trainings: any[]
}

interface Village {
  villageid: number
  villagename: string
  cname: string
  assignments?: any[]
}

interface Training {
  trainingid: number
  trainingname: string
  yearcompleted: number
  durationdays: number
  scope?: string
  conductedby?: string
}

export default function AdminPage() {
  const { toast } = useToast()
  const supabase = getSupabaseBrowser()

  const [echWorkers, setEchWorkers] = useState<EchWorker[]>([])
  const [villages, setVillages] = useState<Village[]>([])
  const [trainings, setTrainings] = useState<Training[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  // Dialog states
  const [showAddWorker, setShowAddWorker] = useState(false)
  const [showAddTraining, setShowAddTraining] = useState(false)
  const [showWorkerDetails, setShowWorkerDetails] = useState(false)
  const [showVillageAssignments, setShowVillageAssignments] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<EchWorker | null>(null)
  const [selectedVillage, setSelectedVillage] = useState<Village | null>(null)

  const [newWorker, setNewWorker] = useState({
    name: "",
    fathername: "",
    nationalid: "",
    joiningdate: "",
    highesteducation: "",
    phonenumber: "",
    address: "",
    selectedTrainings: [] as Array<{ trainingid: number; completiondate: string }>,
  })

  const [newTraining, setNewTraining] = useState({
    trainingname: "",
    yearcompleted: new Date().getFullYear(),
    durationdays: 1,
    scope: "",
    conductedby: "",
  })

  const [assignmentData, setAssignmentData] = useState({
    echid: "",
    villageid: "",
    startdate: "",
  })

  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    await Promise.all([fetchEchWorkers(), fetchVillages(), fetchTrainings()])
    setLoading(false)
  }

  const fetchEchWorkers = async () => {
    try {
      // Fetch ECH workers
      const { data: workers, error: workersError } = await supabase
        .from("ech_worker")
        .select(`
          echid,
          name,
          fathername,
          username,
          nationalid,
          joiningdate,
          departuredate,
          highesteducation,
          phonenumber,
          address
        `)
        .order("echid")

      if (workersError) throw workersError

      // Fetch village assignments and trainings for each worker
      const workersWithDetails = await Promise.all(
        (workers || []).map(async (worker) => {
          // Fetch village assignments
          const { data: villageAssignments, error: villageError } = await supabase
            .from("ech_worker_village")
            .select(`
              villageid,
              assignmentstart,
              assignmentend,
              village:villageid(
                villageid,
                villagename,
                cname
              )
            `)
            .eq("echid", worker.echid)
            .order("assignmentstart", { ascending: false })

          // Fetch training assignments
          const { data: trainingAssignments, error: trainingError } = await supabase
            .from("ech_worker_training")
            .select(`
              completiondate,
              training:trainingid(
                trainingid,
                trainingname,
                yearcompleted,
                durationdays,
                scope,
                conductedby
              )
            `)
            .eq("echid", worker.echid)
            .order("completiondate", { ascending: false })

          return {
            ...worker,
            villages:
              villageAssignments?.map((va) => ({
                ...va.village,
                assignmentstart: va.assignmentstart,
                assignmentend: va.assignmentend,
                isActive: !va.assignmentend,
              })) || [],
            trainings:
              trainingAssignments?.map((ta) => ({
                ...ta.training,
                completiondate: ta.completiondate,
              })) || [],
          }
        }),
      )

      setEchWorkers(workersWithDetails)
    } catch (error) {
      console.error("Error fetching ECH workers:", error)
      toast({ title: "Error", description: "Failed to fetch ECH workers", variant: "destructive" })
    }
  }

  const fetchVillages = async () => {
    try {
      const { data, error } = await supabase
        .from("village")
        .select(`
          villageid,
          villagename,
          cname,
          ech_worker_village(
            echid,
            assignmentstart,
            assignmentend,
            ech_worker:echid(
              echid,
              name
            )
          )
        `)
        .order("villagename")

      if (error) throw error

      const villagesWithAssignments = (data || []).map((village) => ({
        ...village,
        assignments:
          village.ech_worker_village?.map((assignment) => ({
            ...assignment,
            isActive: !assignment.assignmentend, // Active if no end date
          })) || [],
      }))

      setVillages(villagesWithAssignments)
    } catch (error) {
      console.error("Error fetching villages:", error)
      toast({ title: "Error", description: "Failed to fetch villages", variant: "destructive" })
    }
  }

  const fetchTrainings = async () => {
    try {
      const { data, error } = await supabase.from("training").select("*").order("trainingname")

      if (error) throw error
      setTrainings(data || [])
    } catch (error) {
      console.error("Error fetching trainings:", error)
      toast({ title: "Error", description: "Failed to fetch trainings", variant: "destructive" })
    }
  }

  const handleAddWorker = async () => {
    try {
      if (!newWorker.name || !newWorker.nationalid || !newWorker.joiningdate) {
        toast({
          title: "Error",
          description: "Name, National ID, and joining date are required",
          variant: "destructive",
        })
        return
      }

      const response = await fetch("/api/admin/create-ech-worker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newWorker,
          trainings: newWorker.selectedTrainings,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to create ECH worker")
      }

      toast({
        title: "Success",
        description: `ECH worker created successfully. Email: ${result.email}, Password: ${result.password}`,
        duration: 10000,
      })

      setNewWorker({
        name: "",
        fathername: "",
        nationalid: "",
        joiningdate: "",
        highesteducation: "",
        phonenumber: "",
        address: "",
        selectedTrainings: [],
      })
      setShowAddWorker(false)
      fetchEchWorkers()
    } catch (error) {
      console.error("Error adding ECH worker:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add ECH worker",
        variant: "destructive",
      })
    }
  }

  const handleAddTraining = async () => {
    try {
      if (!newTraining.trainingname || !newTraining.yearcompleted || !newTraining.durationdays) {
        toast({ title: "Error", description: "Training name, year, and duration are required", variant: "destructive" })
        return
      }

      const { data, error } = await supabase.from("training").insert([newTraining]).select().single()

      if (error) throw error

      toast({ title: "Success", description: "Training created successfully" })
      setNewTraining({
        trainingname: "",
        yearcompleted: new Date().getFullYear(),
        durationdays: 1,
        scope: "",
        conductedby: "",
      })
      setShowAddTraining(false)
      fetchTrainings()
    } catch (error) {
      console.error("Error adding training:", error)
      toast({ title: "Error", description: "Failed to add training", variant: "destructive" })
    }
  }

  const handleAssignVillage = async () => {
    try {
      if (!assignmentData.echid || !assignmentData.villageid || !assignmentData.startdate) {
        toast({ title: "Error", description: "Please fill all fields", variant: "destructive" })
        return
      }

      const { error } = await supabase.from("ech_worker_village").insert([
        {
          echid: Number.parseInt(assignmentData.echid),
          villageid: Number.parseInt(assignmentData.villageid),
          assignmentstart: assignmentData.startdate,
        },
      ])

      if (error) {
        if (error.code === "23505") {
          toast({
            title: "Error",
            description: "This worker is already assigned to this village",
            variant: "destructive",
          })
        } else {
          throw error
        }
        return
      }

      toast({ title: "Success", description: "Village assigned successfully" })
      setAssignmentData({ echid: "", villageid: "", startdate: "" })
      fetchAllData()
    } catch (error) {
      console.error("Error assigning village:", error)
      toast({ title: "Error", description: "Failed to assign village", variant: "destructive" })
    }
  }

  const handleEndAssignment = async (echId: number, villageId: number) => {
    try {
      const endDate = new Date().toISOString().split("T")[0]

      const { error } = await supabase
        .from("ech_worker_village")
        .update({ assignmentend: endDate })
        .eq("echid", echId)
        .eq("villageid", villageId)
        .is("assignmentend", null)

      if (error) throw error

      toast({ title: "Success", description: "Assignment ended successfully" })
      fetchAllData()
    } catch (error) {
      console.error("Error ending assignment:", error)
      toast({ title: "Error", description: "Failed to end assignment", variant: "destructive" })
    }
  }

  const handleDeleteWorker = async (echId: number) => {
    if (!confirm("Are you sure you want to delete this ECH worker? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch("/api/admin/delete-ech-worker", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ echId }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete ECH worker")
      }

      toast({ title: "Success", description: "ECH worker deleted successfully" })
      fetchEchWorkers()
    } catch (error) {
      console.error("Error deleting ECH worker:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete ECH worker",
        variant: "destructive",
      })
    }
  }

  const filteredWorkers = echWorkers.filter((worker) => {
    const matchesSearch =
      worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.echid.toString().includes(searchTerm) ||
      worker.nationalid.includes(searchTerm)

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && !worker.departuredate) ||
      (statusFilter === "former" && worker.departuredate)

    return matchesSearch && matchesStatus
  })

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-800"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center space-x-2">
            <Shield className="h-8 w-8" />
            <span>Administrator Panel</span>
          </h1>
          <p className="text-gray-600">Comprehensive management of ECH workers, villages, and training programs</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total ECH Workers</p>
                  <p className="text-2xl font-bold text-gray-900">{echWorkers.length}</p>
                </div>
                <Users className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Workers</p>
                  <p className="text-2xl font-bold text-green-600">
                    {echWorkers.filter((w) => !w.departuredate).length}
                  </p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Villages</p>
                  <p className="text-2xl font-bold text-gray-900">{villages.length}</p>
                </div>
                <MapPin className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Training Programs</p>
                  <p className="text-2xl font-bold text-gray-900">{trainings.length}</p>
                </div>
                <GraduationCap className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="workers" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="workers" className="flex items-center space-x-2">
              <Users className="h-4 w-4" />
              <span>ECH Workers</span>
            </TabsTrigger>
            <TabsTrigger value="villages" className="flex items-center space-x-2">
              <MapPin className="h-4 w-4" />
              <span>Village Assignments</span>
            </TabsTrigger>
            <TabsTrigger value="trainings" className="flex items-center space-x-2">
              <GraduationCap className="h-4 w-4" />
              <span>Training Programs</span>
            </TabsTrigger>
          </TabsList>

          {/* ECH Workers Tab */}
          <TabsContent value="workers" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <Users className="h-5 w-5" />
                      <span>ECH Workers Management</span>
                    </CardTitle>
                    <CardDescription>Manage ECH workers, their details, and training records</CardDescription>
                  </div>
                  <Dialog open={showAddWorker} onOpenChange={setShowAddWorker}>
                    <DialogTrigger asChild>
                      <Button className="bg-blue-600 hover:bg-blue-700">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add ECH Worker
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Add New ECH Worker</DialogTitle>
                        <DialogDescription>Create a new ECH worker account with training assignments</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="name">Full Name *</Label>
                            <Input
                              id="name"
                              value={newWorker.name}
                              onChange={(e) => setNewWorker({ ...newWorker, name: e.target.value })}
                              placeholder="Enter full name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="fathername">Father's Name</Label>
                            <Input
                              id="fathername"
                              value={newWorker.fathername}
                              onChange={(e) => setNewWorker({ ...newWorker, fathername: e.target.value })}
                              placeholder="Enter father's name"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="nationalid">National ID *</Label>
                            <Input
                              id="nationalid"
                              value={newWorker.nationalid}
                              onChange={(e) => setNewWorker({ ...newWorker, nationalid: e.target.value })}
                              placeholder="Enter national ID"
                              maxLength={10}
                            />
                          </div>
                          <div>
                            <Label htmlFor="joiningdate">Joining Date *</Label>
                            <Input
                              id="joiningdate"
                              type="date"
                              value={newWorker.joiningdate}
                              onChange={(e) => setNewWorker({ ...newWorker, joiningdate: e.target.value })}
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="education">Highest Education</Label>
                            <Input
                              id="education"
                              value={newWorker.highesteducation}
                              onChange={(e) => setNewWorker({ ...newWorker, highesteducation: e.target.value })}
                              placeholder="e.g., Bachelor's Degree"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              value={newWorker.phonenumber}
                              onChange={(e) => setNewWorker({ ...newWorker, phonenumber: e.target.value })}
                              placeholder="Enter phone number"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="address">Address</Label>
                          <Textarea
                            id="address"
                            value={newWorker.address}
                            onChange={(e) => setNewWorker({ ...newWorker, address: e.target.value })}
                            placeholder="Enter complete address"
                            rows={3}
                          />
                        </div>

                        <div>
                          <Label>Training Programs</Label>
                          <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-3">
                            {trainings.map((training) => (
                              <div key={training.trainingid} className="flex items-center space-x-3">
                                <input
                                  type="checkbox"
                                  id={`training-${training.trainingid}`}
                                  checked={newWorker.selectedTrainings.some(
                                    (t) => t.trainingid === training.trainingid,
                                  )}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewWorker({
                                        ...newWorker,
                                        selectedTrainings: [
                                          ...newWorker.selectedTrainings,
                                          { trainingid: training.trainingid, completiondate: "" },
                                        ],
                                      })
                                    } else {
                                      setNewWorker({
                                        ...newWorker,
                                        selectedTrainings: newWorker.selectedTrainings.filter(
                                          (t) => t.trainingid !== training.trainingid,
                                        ),
                                      })
                                    }
                                  }}
                                  className="rounded"
                                />
                                <label htmlFor={`training-${training.trainingid}`} className="flex-1 text-sm">
                                  {training.trainingname} ({training.yearcompleted})
                                </label>
                                {newWorker.selectedTrainings.some((t) => t.trainingid === training.trainingid) && (
                                  <Input
                                    type="date"
                                    placeholder="Completion date"
                                    className="w-40"
                                    value={
                                      newWorker.selectedTrainings.find((t) => t.trainingid === training.trainingid)
                                        ?.completiondate || ""
                                    }
                                    onChange={(e) => {
                                      setNewWorker({
                                        ...newWorker,
                                        selectedTrainings: newWorker.selectedTrainings.map((t) =>
                                          t.trainingid === training.trainingid
                                            ? { ...t, completiondate: e.target.value }
                                            : t,
                                        ),
                                      })
                                    }}
                                  />
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowAddWorker(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddWorker} className="bg-blue-600 hover:bg-blue-700">
                            <Key className="h-4 w-4 mr-2" />
                            Create Worker & Account
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {/* Search and Filter */}
                <div className="flex items-center space-x-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search by name, ID, or national ID..."
                      className="pl-10"
                    />
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Workers</SelectItem>
                      <SelectItem value="active">Active Only</SelectItem>
                      <SelectItem value="former">Former Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ECH ID</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>National ID</TableHead>
                        <TableHead>Education</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Villages</TableHead>
                        <TableHead>Trainings</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredWorkers.map((worker) => (
                        <TableRow key={worker.echid}>
                          <TableCell className="font-medium">{worker.echid}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{worker.name}</div>
                              {worker.fathername && (
                                <div className="text-sm text-gray-500">S/O {worker.fathername}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{worker.nationalid}</TableCell>
                          <TableCell>{worker.highesteducation || "-"}</TableCell>
                          <TableCell>
                            {worker.departuredate ? (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Former
                              </Badge>
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {worker.villages.filter((v) => v.isActive).length === 0 ? (
                                <Badge variant="outline" className="text-gray-500">
                                  No active assignments
                                </Badge>
                              ) : (
                                worker.villages
                                  .filter((v) => v.isActive)
                                  .slice(0, 2)
                                  .map((village) => (
                                    <Badge key={village.villageid} variant="outline" className="text-xs block">
                                      {village.villagename}
                                    </Badge>
                                  ))
                              )}
                              {worker.villages.filter((v) => v.isActive).length > 2 && (
                                <Badge variant="outline" className="text-xs">
                                  +{worker.villages.filter((v) => v.isActive).length - 2} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              <GraduationCap className="h-4 w-4 text-gray-400" />
                              <span className="text-sm">{worker.trainings.length}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedWorker(worker)
                                  setShowWorkerDetails(true)
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button variant="destructive" size="sm" onClick={() => handleDeleteWorker(worker.echid)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Village Assignments Tab */}
          <TabsContent value="villages" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Village Assignments</span>
                    </CardTitle>
                    <CardDescription>Manage ECH worker assignments to villages</CardDescription>
                  </div>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button className="bg-purple-600 hover:bg-purple-700">
                        <Plus className="h-4 w-4 mr-2" />
                        New Assignment
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Assign Village to ECH Worker</DialogTitle>
                        <DialogDescription>Create a new village assignment for an ECH worker</DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label>ECH Worker</Label>
                          <Select
                            value={assignmentData.echid}
                            onValueChange={(value) => setAssignmentData({ ...assignmentData, echid: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select ECH worker" />
                            </SelectTrigger>
                            <SelectContent>
                              {echWorkers
                                .filter((w) => !w.departuredate)
                                .map((worker) => (
                                  <SelectItem key={worker.echid} value={worker.echid.toString()}>
                                    {worker.name} (ID: {worker.echid})
                                  </SelectItem>
                                ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Village</Label>
                          <Select
                            value={assignmentData.villageid}
                            onValueChange={(value) => setAssignmentData({ ...assignmentData, villageid: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select village" />
                            </SelectTrigger>
                            <SelectContent>
                              {villages.map((village) => (
                                <SelectItem key={village.villageid} value={village.villageid.toString()}>
                                  {village.villagename} ({village.cname})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Assignment Start Date</Label>
                          <Input
                            type="date"
                            value={assignmentData.startdate}
                            onChange={(e) => setAssignmentData({ ...assignmentData, startdate: e.target.value })}
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">Cancel</Button>
                          <Button onClick={handleAssignVillage} className="bg-purple-600 hover:bg-purple-700">
                            Create Assignment
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {villages.map((village) => (
                    <Card key={village.villageid} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{village.villagename}</CardTitle>
                        <CardDescription>{village.cname}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Active Assignments:</span>
                            <Badge variant="outline">
                              {village.assignments?.filter((a) => a.isActive).length || 0}
                            </Badge>
                          </div>

                          {village.assignments
                            ?.filter((a) => a.isActive)
                            .map((assignment) => (
                              <div
                                key={assignment.echid}
                                className="flex items-center justify-between p-2 bg-gray-50 rounded"
                              >
                                <div>
                                  <div className="font-medium text-sm">{assignment.ech_worker?.name}</div>
                                  <div className="text-xs text-gray-500">
                                    Since {new Date(assignment.assignmentstart).toLocaleDateString()}
                                  </div>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEndAssignment(assignment.echid, village.villageid)}
                                >
                                  End
                                </Button>
                              </div>
                            ))}

                          {(!village.assignments || village.assignments.filter((a) => a.isActive).length === 0) && (
                            <div className="text-center py-4 text-gray-500 text-sm">No active assignments</div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Programs Tab */}
          <TabsContent value="trainings" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center space-x-2">
                      <GraduationCap className="h-5 w-5" />
                      <span>Training Programs</span>
                    </CardTitle>
                    <CardDescription>Manage training programs and certifications</CardDescription>
                  </div>
                  <Dialog open={showAddTraining} onOpenChange={setShowAddTraining}>
                    <DialogTrigger asChild>
                      <Button className="bg-orange-600 hover:bg-orange-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Training
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Training Program</DialogTitle>
                        <DialogDescription>
                          Create a new training program that can be assigned to ECH workers
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="trainingname">Training Name *</Label>
                          <Input
                            id="trainingname"
                            value={newTraining.trainingname}
                            onChange={(e) => setNewTraining({ ...newTraining, trainingname: e.target.value })}
                            placeholder="Enter training name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="yearcompleted">Year *</Label>
                            <Input
                              id="yearcompleted"
                              type="number"
                              value={newTraining.yearcompleted}
                              onChange={(e) =>
                                setNewTraining({ ...newTraining, yearcompleted: Number.parseInt(e.target.value) })
                              }
                              min="2000"
                              max="2030"
                            />
                          </div>
                          <div>
                            <Label htmlFor="durationdays">Duration (Days) *</Label>
                            <Input
                              id="durationdays"
                              type="number"
                              value={newTraining.durationdays}
                              onChange={(e) =>
                                setNewTraining({ ...newTraining, durationdays: Number.parseInt(e.target.value) })
                              }
                              min="1"
                            />
                          </div>
                        </div>
                        <div>
                          <Label htmlFor="scope">Scope</Label>
                          <Input
                            id="scope"
                            value={newTraining.scope}
                            onChange={(e) => setNewTraining({ ...newTraining, scope: e.target.value })}
                            placeholder="Training scope or focus area"
                          />
                        </div>
                        <div>
                          <Label htmlFor="conductedby">Conducted By</Label>
                          <Input
                            id="conductedby"
                            value={newTraining.conductedby}
                            onChange={(e) => setNewTraining({ ...newTraining, conductedby: e.target.value })}
                            placeholder="Organization or instructor"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setShowAddTraining(false)}>
                            Cancel
                          </Button>
                          <Button onClick={handleAddTraining} className="bg-orange-600 hover:bg-orange-700">
                            Create Training
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trainings.map((training) => (
                    <Card key={training.trainingid} className="hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{training.trainingname}</CardTitle>
                        <CardDescription>
                          {training.yearcompleted} • {training.durationdays} days
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {training.scope && (
                            <div>
                              <span className="text-sm font-medium">Scope:</span>
                              <p className="text-sm text-gray-600">{training.scope}</p>
                            </div>
                          )}
                          {training.conductedby && (
                            <div>
                              <span className="text-sm font-medium">Conducted by:</span>
                              <p className="text-sm text-gray-600">{training.conductedby}</p>
                            </div>
                          )}
                          <div className="pt-2">
                            <Badge variant="outline" className="text-xs">
                              <Award className="h-3 w-3 mr-1" />
                              {echWorkers.reduce(
                                (count, worker) =>
                                  count + worker.trainings.filter((t) => t.trainingid === training.trainingid).length,
                                0,
                              )}{" "}
                              completions
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Worker Details Dialog */}
        <Dialog open={showWorkerDetails} onOpenChange={setShowWorkerDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <User className="h-5 w-5" />
                <span>{selectedWorker?.name} - Detailed View</span>
              </DialogTitle>
              <DialogDescription>Complete information about ECH worker ID: {selectedWorker?.echid}</DialogDescription>
            </DialogHeader>

            {selectedWorker && (
              <div className="space-y-6">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Full Name</Label>
                        <p className="text-sm">{selectedWorker.name}</p>
                      </div>
                      {selectedWorker.fathername && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Father's Name</Label>
                          <p className="text-sm">{selectedWorker.fathername}</p>
                        </div>
                      )}
                      <div>
                        <Label className="text-sm font-medium text-gray-600">National ID</Label>
                        <p className="text-sm">{selectedWorker.nationalid}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Username</Label>
                        <p className="text-sm">{selectedWorker.username}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-600">Joining Date</Label>
                        <p className="text-sm">{new Date(selectedWorker.joiningdate).toLocaleDateString()}</p>
                      </div>
                      {selectedWorker.departuredate && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Departure Date</Label>
                          <p className="text-sm">{new Date(selectedWorker.departuredate).toLocaleDateString()}</p>
                        </div>
                      )}
                      {selectedWorker.highesteducation && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Education</Label>
                          <p className="text-sm">{selectedWorker.highesteducation}</p>
                        </div>
                      )}
                      {selectedWorker.phonenumber && (
                        <div>
                          <Label className="text-sm font-medium text-gray-600">Phone</Label>
                          <p className="text-sm">{selectedWorker.phonenumber}</p>
                        </div>
                      )}
                    </div>
                    {selectedWorker.address && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium text-gray-600">Address</Label>
                        <p className="text-sm">{selectedWorker.address}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Village Assignments */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <MapPin className="h-5 w-5" />
                      <span>Village Assignments</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedWorker.villages.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No village assignments</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedWorker.villages.map((village, index) => (
                          <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <div className="font-medium">{village.villagename}</div>
                              <div className="text-sm text-gray-500">{village.cname}</div>
                              <div className="text-xs text-gray-400">
                                {new Date(village.assignmentstart).toLocaleDateString()} -{" "}
                                {village.assignmentend
                                  ? new Date(village.assignmentend).toLocaleDateString()
                                  : "Present"}
                              </div>
                            </div>
                            <Badge variant={village.isActive ? "default" : "secondary"}>
                              {village.isActive ? "Active" : "Ended"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Training Records */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center space-x-2">
                      <GraduationCap className="h-5 w-5" />
                      <span>Training Records</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedWorker.trainings.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No training records</p>
                    ) : (
                      <div className="space-y-3">
                        {selectedWorker.trainings.map((training, index) => (
                          <div key={index} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="font-medium">{training.trainingname}</div>
                              <Badge variant="outline">
                                <Clock className="h-3 w-3 mr-1" />
                                {training.durationdays} days
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              Completed: {new Date(training.completiondate).toLocaleDateString()}
                            </div>
                            {training.scope && (
                              <div className="text-sm text-gray-500 mt-1">Scope: {training.scope}</div>
                            )}
                            {training.conductedby && (
                              <div className="text-sm text-gray-500">Conducted by: {training.conductedby}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Info Alert */}
        <Alert className="mt-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Information:</strong> ECH worker accounts are automatically created with email format:
            echid@slf.com and password: slf@2023. Village assignments and training records are tracked with full
            history. All operations are logged for audit purposes.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
