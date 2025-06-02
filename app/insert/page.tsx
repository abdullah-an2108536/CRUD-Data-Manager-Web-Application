"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import AddPopup from "@/components/add-popup"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/components/auth-provider"
import { useEchWorkerVillages } from "@/hooks/use-ech-worker-villages"
import { Plus, Trash2, Users, MapPin, User, Syringe, AlertTriangle, ShoppingCart, Scissors, Shield } from "lucide-react"

export default function InsertPage() {
  const { toast } = useToast()
  const { user } = useAuth()
  const supabase = getSupabaseBrowser()
  const {
    villages: assignedVillages,
    loading: villagesLoading,
    error: villagesError,
    getVillagesByCommunity,
  } = useEchWorkerVillages()

  const [communities, setCommunities] = useState<any[]>([])
  const [beneficiaries, setBeneficiaries] = useState<any[]>([])
  const [echWorkers, setEchWorkers] = useState<any[]>([])
  const [currentEchWorker, setCurrentEchWorker] = useState<any>(null)

  const [selectedCommunity, setSelectedCommunity] = useState("")
  const [selectedVillage, setSelectedVillage] = useState("")
  const [selectedBeneficiary, setSelectedBeneficiary] = useState("")

  const [formData, setFormData] = useState({
    // Main Vaccination Record fields
    season: "",
    vdate: "",
    echid: "",
    donor: "",

    // Slaughter data (part of VACCINATION_RECORD)
    banimalslaughtered: "",
    sanimalslaughtered: "",

    // Sales data (part of VACCINATION_RECORD)
    sheepsold: "",
    cattlesold: "",
    goatsold: "",
    persoldanimalcost: "",

    // Vaccination data (VRecord table)
    vaccinations: [
      {
        vaccinationtype: "",
        vsheep: "",
        vgoat: "",
        vcattle: "",
        vdozoo_yak: "",
        vothers: "",
      },
    ],

    // Disease data (Disease_Record table)
    diseases: [
      {
        diseasetype: "",
        dsheep: "",
        dgoat: "",
        dcattle: "",
        ddozoo_yak: "",
        dothers: "",
        symptoms: [""],
      },
    ],

    // Predation data (Predation_Record table)
    predations: [
      {
        predatortype: "",
        psheep: "",
        pgoat: "",
        pcattle: "",
        pdozoo_yak: "",
        pothers: "",
        perpreyanimalcost: "",
      },
    ],
  })

  const [availableDonors, setAvailableDonors] = useState<string[]>([
    "WHO",
    "UNICEF",
    "World Bank",
    "EU",
    "USAID",
    "Local Government",
  ])
  const [newDonor, setNewDonor] = useState("")
  const [showAddDonor, setShowAddDonor] = useState(false)

  useEffect(() => {
    fetchCommunities()
    fetchEchWorkers()

    // Get current ECH worker ID from email
    if (user?.email) {
      const echId = user.email.split("@")[0]
      fetchCurrentEchWorker(echId)
    }
  }, [user])

  useEffect(() => {
    if (currentEchWorker) {
      setFormData((prev) => ({
        ...prev,
        echid: currentEchWorker.echid.toString(),
      }))
    }
  }, [currentEchWorker])

  useEffect(() => {
    if (selectedVillage) {
      fetchBeneficiaries(selectedVillage)
    }
  }, [selectedVillage])

  // Reset village selection when community changes
  useEffect(() => {
    setSelectedVillage("")
    setSelectedBeneficiary("")
  }, [selectedCommunity])

  // Reset beneficiary selection when village changes
  useEffect(() => {
    setSelectedBeneficiary("")
  }, [selectedVillage])

  const fetchCurrentEchWorker = async (echId: string) => {
    const { data, error } = await supabase.from("ech_worker").select("*").eq("echid", echId).single()

    if (error) {
      toast({ title: "Error", description: "Failed to fetch your ECH worker profile", variant: "destructive" })
    } else {
      setCurrentEchWorker(data)
    }
  }

  const fetchCommunities = async () => {
    const { data, error } = await supabase.from("community").select("cname").order("cname")

    if (error) {
      toast({ title: "Error", description: "Failed to fetch communities", variant: "destructive" })
    } else {
      setCommunities(data || [])
    }
  }

  const fetchBeneficiaries = async (villageId: string) => {
    const { data, error } = await supabase
      .from("beneficiary")
      .select("bid, bname, fathername")
      .eq("villageid", Number.parseInt(villageId))
      .order("bname")

    if (error) {
      toast({ title: "Error", description: "Failed to fetch beneficiaries", variant: "destructive" })
    } else {
      setBeneficiaries(data || [])
    }
  }

  const fetchEchWorkers = async () => {
    const { data, error } = await supabase.from("ech_worker").select("echid, name").order("name")

    if (error) {
      toast({ title: "Error", description: "Failed to fetch ECH workers", variant: "destructive" })
    } else {
      setEchWorkers(data || [])
    }
  }

  const addCommunity = async (data: any) => {
    const { error } = await supabase.from("community").insert([data])

    if (error) {
      toast({ title: "Error", description: "Failed to add community", variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Community added successfully" })
      fetchCommunities()
    }
  }

  const addVillage = async (data: any) => {
    try {
      // First, create the village record
      const villageData = { ...data, cname: selectedCommunity }
      const { data: newVillage, error: villageError } = await supabase
        .from("village")
        .insert([villageData])
        .select()
        .single()

      if (villageError) {
        toast({ title: "Error", description: "Failed to add village", variant: "destructive" })
        return
      }

      // Get the current date for assignment start
      const today = new Date().toISOString().split("T")[0]

      // Now automatically assign this village to the current ECH worker
      if (currentEchWorker && newVillage) {
        const { error: assignmentError } = await supabase.from("ech_worker_village").insert([
          {
            echid: currentEchWorker.echid,
            villageid: newVillage.villageid,
            assignmentstart: today,
            // assignmentend is null for active assignments
          },
        ])

        if (assignmentError) {
          console.error("Error assigning village to ECH worker:", assignmentError)
          toast({
            title: "Warning",
            description: "Village created but could not be assigned to your account automatically",
            variant: "default",
          })
        } else {
          toast({
            title: "Success",
            description: "Village added and assigned to your account successfully",
            variant: "default",
          })

          // Refresh the list of assigned villages
          setTimeout(() => {
            window.location.reload() // Simple refresh to update the villages list
          }, 1500)
        }
      } else {
        toast({ title: "Success", description: "Village added successfully" })
      }
    } catch (error) {
      console.error("Error in village creation:", error)
      toast({ title: "Error", description: "Failed to add village", variant: "destructive" })
    }
  }

  const addBeneficiary = async (data: any) => {
    const beneficiaryData = { ...data, villageid: Number.parseInt(selectedVillage) }
    const { error } = await supabase.from("beneficiary").insert([beneficiaryData])

    if (error) {
      toast({ title: "Error", description: "Failed to add beneficiary", variant: "destructive" })
    } else {
      toast({ title: "Success", description: "Beneficiary added successfully" })
      fetchBeneficiaries(selectedVillage)
    }
  }

  const addVaccination = () => {
    setFormData({
      ...formData,
      vaccinations: [
        ...formData.vaccinations,
        { vaccinationtype: "", vsheep: "", vgoat: "", vcattle: "", vdozoo_yak: "", vothers: "" },
      ],
    })
  }

  const removeVaccination = (index: number) => {
    const newVaccinations = formData.vaccinations.filter((_, i) => i !== index)
    setFormData({ ...formData, vaccinations: newVaccinations })
  }

  const addDisease = () => {
    setFormData({
      ...formData,
      diseases: [
        ...formData.diseases,
        { diseasetype: "", dsheep: "", dgoat: "", dcattle: "", ddozoo_yak: "", dothers: "", symptoms: [""] },
      ],
    })
  }

  const removeDisease = (index: number) => {
    const newDiseases = formData.diseases.filter((_, i) => i !== index)
    setFormData({ ...formData, diseases: newDiseases })
  }

  const addPredation = () => {
    setFormData({
      ...formData,
      predations: [
        ...formData.predations,
        { predatortype: "", psheep: "", pgoat: "", pcattle: "", pdozoo_yak: "", pothers: "", perpreyanimalcost: "" },
      ],
    })
  }

  const removePredation = (index: number) => {
    const newPredations = formData.predations.filter((_, i) => i !== index)
    setFormData({ ...formData, predations: newPredations })
  }

  const addSymptom = (diseaseIndex: number) => {
    const newDiseases = [...formData.diseases]
    newDiseases[diseaseIndex].symptoms.push("")
    setFormData({ ...formData, diseases: newDiseases })
  }

  const removeSymptom = (diseaseIndex: number, symptomIndex: number) => {
    const newDiseases = [...formData.diseases]
    newDiseases[diseaseIndex].symptoms = newDiseases[diseaseIndex].symptoms.filter((_, i) => i !== symptomIndex)
    setFormData({ ...formData, diseases: newDiseases })
  }

  const addNewDonor = () => {
    if (newDonor.trim() && !availableDonors.includes(newDonor.trim())) {
      setAvailableDonors([...availableDonors, newDonor.trim()])
      setFormData({ ...formData, donor: newDonor.trim() })
      setNewDonor("")
      setShowAddDonor(false)
      toast({ title: "Success", description: "Donor added to list" })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedBeneficiary) {
      toast({ title: "Error", description: "Please select a beneficiary", variant: "destructive" })
      return
    }

    // Verify ECH worker has access to the selected village
    const selectedVillageData = assignedVillages.find((v) => v.villageid === Number.parseInt(selectedVillage))
    if (!selectedVillageData) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to enter data for this village",
        variant: "destructive",
      })
      return
    }

    try {
      // Extract year from date
      const year = formData.vdate ? new Date(formData.vdate).getFullYear() : new Date().getFullYear()

      // Insert vaccination record
      const { data: vaccinationRecord, error: vaccinationError } = await supabase
        .from("vaccination_record")
        .insert([
          {
            vyear: year, // Use extracted year
            season: formData.season,
            vdate: formData.vdate,
            echid: Number.parseInt(formData.echid),
            donor: formData.donor || null,
            banimalslaughtered: Number.parseInt(formData.banimalslaughtered) || null,
            sanimalslaughtered: Number.parseInt(formData.sanimalslaughtered) || null,
            sheepsold: Number.parseInt(formData.sheepsold) || null,
            cattlesold: Number.parseInt(formData.cattlesold) || null,
            goatsold: Number.parseInt(formData.goatsold) || null,
            persoldanimalcost: Number.parseFloat(formData.persoldanimalcost) || null,
            bid: Number.parseInt(selectedBeneficiary),
          },
        ])
        .select()

      if (vaccinationError) throw vaccinationError

      const rid = vaccinationRecord[0].rid

      // Insert vaccination data
      for (const vacc of formData.vaccinations) {
        if (vacc.vaccinationtype) {
          await supabase.from("vrecord").insert([
            {
              rid,
              vaccinationtype: vacc.vaccinationtype,
              vsheep: Number.parseInt(vacc.vsheep) || null,
              vgoat: Number.parseInt(vacc.vgoat) || null,
              vcattle: Number.parseInt(vacc.vcattle) || null,
              vdozoo_yak: Number.parseInt(vacc.vdozoo_yak) || null,
              vothers: Number.parseInt(vacc.vothers) || null,
            },
          ])
        }
      }

      // Insert disease data
      for (const disease of formData.diseases) {
        if (disease.diseasetype) {
          const { data: diseaseRecord } = await supabase
            .from("disease_record")
            .insert([
              {
                rid,
                diseasetype: disease.diseasetype,
                dsheep: Number.parseInt(disease.dsheep) || null,
                dgoat: Number.parseInt(disease.dgoat) || null,
                dcattle: Number.parseInt(disease.dcattle) || null,
                ddozoo_yak: Number.parseInt(disease.ddozoo_yak) || null,
                dothers: Number.parseInt(disease.dothers) || null,
              },
            ])
            .select()

          if (diseaseRecord && diseaseRecord[0]) {
            for (const symptom of disease.symptoms) {
              if (symptom) {
                await supabase.from("disease_record_symptoms").insert([
                  {
                    diseaseid: diseaseRecord[0].diseaseid,
                    symptom,
                  },
                ])
              }
            }
          }
        }
      }

      // Insert predation data
      for (const predation of formData.predations) {
        if (predation.predatortype) {
          await supabase.from("predation_record").insert([
            {
              rid,
              predatortype: predation.predatortype,
              psheep: Number.parseInt(predation.psheep) || null,
              pgoat: Number.parseInt(predation.pgoat) || null,
              pcattle: Number.parseInt(predation.pcattle) || null,
              pdozoo_yak: Number.parseInt(predation.pdozoo_yak) || null,
              pothers: Number.parseInt(predation.pothers) || null,
              perpreyanimalcost: Number.parseFloat(predation.perpreyanimalcost) || null,
            },
          ])
        }
      }

      toast({ title: "Success", description: "Data inserted successfully" })

      // Reset form
      setFormData({
        season: "",
        vdate: "",
        echid: currentEchWorker?.echid.toString() || "",
        donor: "",
        banimalslaughtered: "",
        sanimalslaughtered: "",
        sheepsold: "",
        cattlesold: "",
        goatsold: "",
        persoldanimalcost: "",
        vaccinations: [{ vaccinationtype: "", vsheep: "", vgoat: "", vcattle: "", vdozoo_yak: "", vothers: "" }],
        diseases: [
          { diseasetype: "", dsheep: "", dgoat: "", dcattle: "", ddozoo_yak: "", dothers: "", symptoms: [""] },
        ],
        predations: [
          { predatortype: "", psheep: "", pgoat: "", pcattle: "", pdozoo_yak: "", pothers: "", perpreyanimalcost: "" },
        ],
      })
      setSelectedCommunity("")
      setSelectedVillage("")
      setSelectedBeneficiary("")
    } catch (error) {
      console.error("Error inserting data:", error)
      toast({ title: "Error", description: "Failed to insert data", variant: "destructive" })
    }
  }

  // Get villages for the selected community that the ECH worker has access to
  const availableVillages = selectedCommunity ? getVillagesByCommunity(selectedCommunity) : []

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Entry Portal</h1>
          {currentEchWorker && (
            <div className="space-y-2">
              <p className="text-gray-600">
                Welcome, <span className="font-semibold">{currentEchWorker.name}</span>. Enter comprehensive
                vaccination, disease, and predation data.
              </p>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <Shield className="h-4 w-4" />
                <span>You have access to {assignedVillages.length} village(s)</span>
              </div>
            </div>
          )}
        </div>

        {/* Show error if villages failed to load */}
        {villagesError && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {villagesError}. Please contact your administrator to assign villages to your account.
            </AlertDescription>
          </Alert>
        )}

        {/* Show warning if no villages assigned */}
        {!villagesLoading && assignedVillages.length === 0 && (
          <Alert className="mb-6">
            <Shield className="h-4 w-4" />
            <AlertDescription>
              No villages are assigned to your account. Please contact your administrator to assign villages before
              entering data.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Selection Section */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <MapPin className="h-5 w-5" />
                <span>Location & Beneficiary Selection</span>
              </CardTitle>
              <CardDescription>Select the community, village, and beneficiary for this record</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Community Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <Users className="h-4 w-4" />
                    <span>Community</span>
                  </Label>
                  <div className="flex space-x-2">
                    <Select value={selectedCommunity} onValueChange={setSelectedCommunity}>
                      <SelectTrigger className="flex-1 border-gray-300 focus:border-gray-500">
                        <SelectValue placeholder="Select community" />
                      </SelectTrigger>
                      <SelectContent>
                        {communities.map((community) => (
                          <SelectItem key={community.cname} value={community.cname}>
                            {community.cname}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AddPopup type="community" onAdd={addCommunity} />
                  </div>
                </div>

                {/* Village Selection - Only show villages assigned to ECH worker */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <MapPin className="h-4 w-4" />
                    <span>Village</span>
                    {selectedCommunity && availableVillages.length === 0 && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        No access
                      </Badge>
                    )}
                  </Label>
                  <div className="flex space-x-2">
                    <Select
                      value={selectedVillage}
                      onValueChange={setSelectedVillage}
                      disabled={!selectedCommunity || availableVillages.length === 0}
                    >
                      <SelectTrigger className="flex-1 border-gray-300 focus:border-gray-500">
                        <SelectValue
                          placeholder={
                            !selectedCommunity
                              ? "Select community first"
                              : availableVillages.length === 0
                                ? "No villages available"
                                : "Select village"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVillages.map((village) => (
                          <SelectItem key={village.villageid} value={village.villageid.toString()}>
                            {village.villagename}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AddPopup type="village" onAdd={addVillage} parentData={{ community: selectedCommunity }} />
                  </div>
                  {selectedCommunity && availableVillages.length === 0 && (
                    <p className="text-xs text-gray-500">You don't have access to any villages in this community</p>
                  )}
                </div>

                {/* Beneficiary Selection */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700 flex items-center space-x-1">
                    <User className="h-4 w-4" />
                    <span>Beneficiary</span>
                  </Label>
                  <div className="flex space-x-2">
                    <Select
                      value={selectedBeneficiary}
                      onValueChange={setSelectedBeneficiary}
                      disabled={!selectedVillage}
                    >
                      <SelectTrigger className="flex-1 border-gray-300 focus:border-gray-500">
                        <SelectValue placeholder="Select beneficiary" />
                      </SelectTrigger>
                      <SelectContent>
                        {beneficiaries.map((beneficiary) => (
                          <SelectItem key={beneficiary.bid} value={beneficiary.bid.toString()}>
                            {beneficiary.bname} {beneficiary.fathername && `(${beneficiary.fathername})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <AddPopup type="beneficiary" onAdd={addBeneficiary} parentData={{ village: selectedVillage }} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Main Vaccination Record */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Syringe className="h-5 w-5" />
                <span>Vaccination Record Details</span>
              </CardTitle>
              <CardDescription>Basic information about the vaccination session</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="season" className="text-sm font-medium text-gray-700">
                    Season *
                  </Label>
                  <Select
                    value={formData.season}
                    onValueChange={(value) => setFormData({ ...formData, season: value })}
                  >
                    <SelectTrigger className="border-gray-300 focus:border-gray-500">
                      <SelectValue placeholder="Select season" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Spring">Spring</SelectItem>
                      <SelectItem value="Summer">Summer</SelectItem>
                      <SelectItem value="Autumn">Autumn</SelectItem>
                      <SelectItem value="Winter">Winter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="vdate" className="text-sm font-medium text-gray-700">
                    Date * (Year will be auto-extracted)
                  </Label>
                  <Input
                    id="vdate"
                    type="date"
                    value={formData.vdate}
                    onChange={(e) => setFormData({ ...formData, vdate: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="echid" className="text-sm font-medium text-gray-700">
                    ECH Worker *
                  </Label>
                  <Select value={formData.echid} onValueChange={(value) => setFormData({ ...formData, echid: value })}>
                    <SelectTrigger className="border-gray-300 focus:border-gray-500">
                      <SelectValue placeholder="Select ECH worker" />
                    </SelectTrigger>
                    <SelectContent>
                      {echWorkers.map((worker) => (
                        <SelectItem key={worker.echid} value={worker.echid.toString()}>
                          {worker.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Donor</Label>
                  <div className="flex space-x-2">
                    <Select
                      value={formData.donor}
                      onValueChange={(value) => setFormData({ ...formData, donor: value })}
                    >
                      <SelectTrigger className="flex-1 border-gray-300 focus:border-gray-500">
                        <SelectValue placeholder="Select donor" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableDonors.map((donor) => (
                          <SelectItem key={donor} value={donor}>
                            {donor}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAddDonor(!showAddDonor)}
                      className="border-gray-300 hover:bg-gray-50"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {showAddDonor && (
                    <div className="flex space-x-2 mt-2">
                      <Input
                        value={newDonor}
                        onChange={(e) => setNewDonor(e.target.value)}
                        placeholder="Enter new donor name"
                        className="flex-1 border-gray-300 focus:border-gray-500"
                        onKeyPress={(e) => e.key === "Enter" && addNewDonor()}
                      />
                      <Button type="button" onClick={addNewDonor} size="sm" className="bg-gray-800 hover:bg-gray-900">
                        Add
                      </Button>
                      <Button type="button" onClick={() => setShowAddDonor(false)} variant="outline" size="sm">
                        Cancel
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Rest of the form sections remain the same... */}
          {/* I'll include the vaccination, disease, predation sections but they're unchanged */}

          {/* Vaccination Data Section */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center justify-between text-gray-800">
                <div className="flex items-center space-x-2">
                  <Syringe className="h-5 w-5" />
                  <span>Vaccination Data</span>
                </div>
                <Button type="button" onClick={addVaccination} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Vaccination
                </Button>
              </CardTitle>
              <CardDescription>Record vaccination details by type and animal count</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {formData.vaccinations.map((vaccination, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant="outline" className="bg-white">
                      Vaccination {index + 1}
                    </Badge>
                    {formData.vaccinations.length > 1 && (
                      <Button type="button" onClick={() => removeVaccination(index)} variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="md:col-span-3">
                      <Label className="text-sm font-medium text-gray-700">Vaccination Type</Label>
                      <Input
                        value={vaccination.vaccinationtype}
                        onChange={(e) => {
                          const newVaccinations = [...formData.vaccinations]
                          newVaccinations[index].vaccinationtype = e.target.value
                          setFormData({ ...formData, vaccinations: newVaccinations })
                        }}
                        placeholder="e.g., FMD, PPR, Anthrax"
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Sheep</Label>
                      <Input
                        type="number"
                        value={vaccination.vsheep}
                        onChange={(e) => {
                          const newVaccinations = [...formData.vaccinations]
                          newVaccinations[index].vsheep = e.target.value
                          setFormData({ ...formData, vaccinations: newVaccinations })
                        }}
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Goat</Label>
                      <Input
                        type="number"
                        value={vaccination.vgoat}
                        onChange={(e) => {
                          const newVaccinations = [...formData.vaccinations]
                          newVaccinations[index].vgoat = e.target.value
                          setFormData({ ...formData, vaccinations: newVaccinations })
                        }}
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Cattle</Label>
                      <Input
                        type="number"
                        value={vaccination.vcattle}
                        onChange={(e) => {
                          const newVaccinations = [...formData.vaccinations]
                          newVaccinations[index].vcattle = e.target.value
                          setFormData({ ...formData, vaccinations: newVaccinations })
                        }}
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Dozoo/Yak</Label>
                      <Input
                        type="number"
                        value={vaccination.vdozoo_yak}
                        onChange={(e) => {
                          const newVaccinations = [...formData.vaccinations]
                          newVaccinations[index].vdozoo_yak = e.target.value
                          setFormData({ ...formData, vaccinations: newVaccinations })
                        }}
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Others</Label>
                      <Input
                        type="number"
                        value={vaccination.vothers}
                        onChange={(e) => {
                          const newVaccinations = [...formData.vaccinations]
                          newVaccinations[index].vothers = e.target.value
                          setFormData({ ...formData, vaccinations: newVaccinations })
                        }}
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Slaughter Data Section */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <Scissors className="h-5 w-5" />
                <span>Slaughter Data</span>
              </CardTitle>
              <CardDescription>Record animals slaughtered during the period</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="banimalslaughtered" className="text-sm font-medium text-gray-700">
                    Big Animals Slaughtered
                  </Label>
                  <Input
                    id="banimalslaughtered"
                    type="number"
                    value={formData.banimalslaughtered}
                    onChange={(e) => setFormData({ ...formData, banimalslaughtered: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                    placeholder="Number of big animals"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sanimalslaughtered" className="text-sm font-medium text-gray-700">
                    Small Animals Slaughtered
                  </Label>
                  <Input
                    id="sanimalslaughtered"
                    type="number"
                    value={formData.sanimalslaughtered}
                    onChange={(e) => setFormData({ ...formData, sanimalslaughtered: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                    placeholder="Number of small animals"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Sales Data Section */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center space-x-2 text-gray-800">
                <ShoppingCart className="h-5 w-5" />
                <span>Sales Data</span>
              </CardTitle>
              <CardDescription>Record animal sales and pricing information</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="sheepsold" className="text-sm font-medium text-gray-700">
                    Sheep Sold
                  </Label>
                  <Input
                    id="sheepsold"
                    type="number"
                    value={formData.sheepsold}
                    onChange={(e) => setFormData({ ...formData, sheepsold: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cattlesold" className="text-sm font-medium text-gray-700">
                    Cattle Sold
                  </Label>
                  <Input
                    id="cattlesold"
                    type="number"
                    value={formData.cattlesold}
                    onChange={(e) => setFormData({ ...formData, cattlesold: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goatsold" className="text-sm font-medium text-gray-700">
                    Goat Sold
                  </Label>
                  <Input
                    id="goatsold"
                    type="number"
                    value={formData.goatsold}
                    onChange={(e) => setFormData({ ...formData, goatsold: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persoldanimalcost" className="text-sm font-medium text-gray-700">
                    Price per Animal
                  </Label>
                  <Input
                    id="persoldanimalcost"
                    type="number"
                    step="0.01"
                    value={formData.persoldanimalcost}
                    onChange={(e) => setFormData({ ...formData, persoldanimalcost: e.target.value })}
                    className="border-gray-300 focus:border-gray-500"
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Disease Data Section */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center justify-between text-gray-800">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Disease Records</span>
                </div>
                <Button type="button" onClick={addDisease} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Disease
                </Button>
              </CardTitle>
              <CardDescription>Record disease outbreaks and affected animals</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {formData.diseases.map((disease, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant="outline" className="bg-white">
                      Disease Record {index + 1}
                    </Badge>
                    {formData.diseases.length > 1 && (
                      <Button type="button" onClick={() => removeDisease(index)} variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">Disease Type</Label>
                      <Input
                        value={disease.diseasetype}
                        onChange={(e) => {
                          const newDiseases = [...formData.diseases]
                          newDiseases[index].diseasetype = e.target.value
                          setFormData({ ...formData, diseases: newDiseases })
                        }}
                        placeholder="e.g., FMD, PPR, Pneumonia"
                        className="border-gray-300 focus:border-gray-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Sheep</Label>
                        <Input
                          type="number"
                          value={disease.dsheep}
                          onChange={(e) => {
                            const newDiseases = [...formData.diseases]
                            newDiseases[index].dsheep = e.target.value
                            setFormData({ ...formData, diseases: newDiseases })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Goat</Label>
                        <Input
                          type="number"
                          value={disease.dgoat}
                          onChange={(e) => {
                            const newDiseases = [...formData.diseases]
                            newDiseases[index].dgoat = e.target.value
                            setFormData({ ...formData, diseases: newDiseases })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Cattle</Label>
                        <Input
                          type="number"
                          value={disease.dcattle}
                          onChange={(e) => {
                            const newDiseases = [...formData.diseases]
                            newDiseases[index].dcattle = e.target.value
                            setFormData({ ...formData, diseases: newDiseases })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Dozoo/Yak</Label>
                        <Input
                          type="number"
                          value={disease.ddozoo_yak}
                          onChange={(e) => {
                            const newDiseases = [...formData.diseases]
                            newDiseases[index].ddozoo_yak = e.target.value
                            setFormData({ ...formData, diseases: newDiseases })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Others</Label>
                        <Input
                          type="number"
                          value={disease.dothers}
                          onChange={(e) => {
                            const newDiseases = [...formData.diseases]
                            newDiseases[index].dothers = e.target.value
                            setFormData({ ...formData, diseases: newDiseases })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <Label className="text-sm font-medium text-gray-700">Symptoms</Label>
                        <Button type="button" onClick={() => addSymptom(index)} variant="outline" size="sm">
                          <Plus className="h-3 w-3 mr-1" />
                          Add Symptom
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {disease.symptoms.map((symptom, symptomIndex) => (
                          <div key={symptomIndex} className="flex space-x-2">
                            <Input
                              value={symptom}
                              onChange={(e) => {
                                const newDiseases = [...formData.diseases]
                                newDiseases[index].symptoms[symptomIndex] = e.target.value
                                setFormData({ ...formData, diseases: newDiseases })
                              }}
                              placeholder="Enter symptom"
                              className="flex-1 border-gray-300 focus:border-gray-500"
                            />
                            {disease.symptoms.length > 1 && (
                              <Button
                                type="button"
                                onClick={() => removeSymptom(index, symptomIndex)}
                                variant="outline"
                                size="sm"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Separator />

          {/* Predation Data Section */}
          <Card className="shadow-sm">
            <CardHeader className="bg-gray-50 border-b">
              <CardTitle className="flex items-center justify-between text-gray-800">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5" />
                  <span>Predation Records</span>
                </div>
                <Button type="button" onClick={addPredation} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Predation
                </Button>
              </CardTitle>
              <CardDescription>Record predator attacks and livestock losses</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-6">
              {formData.predations.map((predation, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex justify-between items-center mb-4">
                    <Badge variant="outline" className="bg-white">
                      Predation Record {index + 1}
                    </Badge>
                    {formData.predations.length > 1 && (
                      <Button type="button" onClick={() => removePredation(index)} variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Predator Type</Label>
                        <Input
                          value={predation.predatortype}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].predatortype = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          placeholder="e.g., Snow Leopard, Wolf, Bear"
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Cost per Prey Animal</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={predation.perpreyanimalcost}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].perpreyanimalcost = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Sheep</Label>
                        <Input
                          type="number"
                          value={predation.psheep}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].psheep = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Goat</Label>
                        <Input
                          type="number"
                          value={predation.pgoat}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].pgoat = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Cattle</Label>
                        <Input
                          type="number"
                          value={predation.pcattle}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].pcattle = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Dozoo/Yak</Label>
                        <Input
                          type="number"
                          value={predation.pdozoo_yak}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].pdozoo_yak = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Others</Label>
                        <Input
                          type="number"
                          value={predation.pothers}
                          onChange={(e) => {
                            const newPredations = [...formData.predations]
                            newPredations[index].pothers = e.target.value
                            setFormData({ ...formData, predations: newPredations })
                          }}
                          className="border-gray-300 focus:border-gray-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Submit Section */}
          <Card className="shadow-sm">
            <CardContent className="p-6">
              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" size="lg">
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="bg-gray-800 hover:bg-gray-900 text-white"
                  disabled={assignedVillages.length === 0}
                >
                  Submit Complete Record
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </div>
  )
}
