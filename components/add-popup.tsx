"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus } from "lucide-react"

interface AddPopupProps {
  type: "community" | "village" | "beneficiary"
  onAdd: (data: any) => void
  parentData?: any
}

export default function AddPopup({ type, onAdd, parentData }: AddPopupProps) {
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(formData)
    setFormData({})
    setOpen(false)
  }

  const renderForm = () => {
    switch (type) {
      case "community":
        return (
          <div className="space-y-4 max-h-96 overflow-y-auto">
            <div>
              <Label htmlFor="cname">Community Name *</Label>
              <Input
                id="cname"
                value={formData.cname || ""}
                onChange={(e) => setFormData({ ...formData, cname: e.target.value })}
                required
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="alias">Alias</Label>
              <Input
                id="alias"
                value={formData.alias || ""}
                onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country || ""}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={formData.province || ""}
                onChange={(e) => setFormData({ ...formData, province: e.target.value })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                value={formData.district || ""}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gpslat">GPS Latitude</Label>
                <Input
                  id="gpslat"
                  type="number"
                  step="0.000001"
                  value={formData.gpslat || ""}
                  onChange={(e) => setFormData({ ...formData, gpslat: Number.parseFloat(e.target.value) || null })}
                  className="border-gray-300 focus:border-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="gpslong">GPS Longitude</Label>
                <Input
                  id="gpslong"
                  type="number"
                  step="0.000001"
                  value={formData.gpslong || ""}
                  onChange={(e) => setFormData({ ...formData, gpslong: Number.parseFloat(e.target.value) || null })}
                  className="border-gray-300 focus:border-gray-500"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="area">Total Area (sq km)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: Number.parseFloat(e.target.value) || null })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="forestarea">Forest Area (sq km)</Label>
              <Input
                id="forestarea"
                type="number"
                step="0.01"
                value={formData.forestarea || ""}
                onChange={(e) => setFormData({ ...formData, forestarea: Number.parseFloat(e.target.value) || null })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="pastureland">Pasture Land (sq km)</Label>
              <Input
                id="pastureland"
                type="number"
                step="0.01"
                value={formData.pastureland || ""}
                onChange={(e) => setFormData({ ...formData, pastureland: Number.parseFloat(e.target.value) || null })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="protection_status">Protection Status</Label>
              <Select
                value={formData.protection_status || ""}
                onValueChange={(value) => setFormData({ ...formData, protection_status: value })}
              >
                <SelectTrigger className="border-gray-300 focus:border-gray-500">
                  <SelectValue placeholder="Select protection status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Protected">Protected</SelectItem>
                  <SelectItem value="Partially Protected">Partially Protected</SelectItem>
                  <SelectItem value="Unprotected">Unprotected</SelectItem>
                  <SelectItem value="National Park">National Park</SelectItem>
                  <SelectItem value="Wildlife Reserve">Wildlife Reserve</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )
      case "village":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="villagename">Village Name *</Label>
              <Input
                id="villagename"
                value={formData.villagename || ""}
                onChange={(e) => setFormData({ ...formData, villagename: e.target.value })}
                required
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="population">Population</Label>
              <Input
                id="population"
                type="number"
                value={formData.population || ""}
                onChange={(e) => setFormData({ ...formData, population: Number.parseInt(e.target.value) || null })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="area">Area (sq km)</Label>
              <Input
                id="area"
                type="number"
                step="0.01"
                value={formData.area || ""}
                onChange={(e) => setFormData({ ...formData, area: Number.parseFloat(e.target.value) || null })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="gpslat">GPS Latitude</Label>
                <Input
                  id="gpslat"
                  type="number"
                  step="0.000001"
                  value={formData.gpslat || ""}
                  onChange={(e) => setFormData({ ...formData, gpslat: Number.parseFloat(e.target.value) || null })}
                  className="border-gray-300 focus:border-gray-500"
                />
              </div>
              <div>
                <Label htmlFor="gpslong">GPS Longitude</Label>
                <Input
                  id="gpslong"
                  type="number"
                  step="0.000001"
                  value={formData.gpslong || ""}
                  onChange={(e) => setFormData({ ...formData, gpslong: Number.parseFloat(e.target.value) || null })}
                  className="border-gray-300 focus:border-gray-500"
                />
              </div>
            </div>
          </div>
        )
      case "beneficiary":
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="bname">Beneficiary Name *</Label>
              <Input
                id="bname"
                value={formData.bname || ""}
                onChange={(e) => setFormData({ ...formData, bname: e.target.value })}
                required
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
            <div>
              <Label htmlFor="fathername">Father Name</Label>
              <Input
                id="fathername"
                value={formData.fathername || ""}
                onChange={(e) => setFormData({ ...formData, fathername: e.target.value })}
                className="border-gray-300 focus:border-gray-500"
              />
            </div>
          </div>
        )
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="border-gray-300 hover:bg-gray-50">
          <Plus className="h-4 w-4 mr-1" />
          Add {type}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New {type.charAt(0).toUpperCase() + type.slice(1)}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          {renderForm()}
          <div className="flex justify-end space-x-2 mt-6">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" className="bg-gray-800 hover:bg-gray-900">
              Add {type}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
