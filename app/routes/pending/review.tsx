import {
  FileText,
  ArrowUpRight,
  Phone,
  Mail,
  IdCard,
  CheckCircle2,
  EyeIcon,
  PenTool,
  AlertCircle,
} from "lucide-react";
import { Button } from "~/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "~/components/ui/carousel";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { useEffect, useState } from "react";

import { Avatar, AvatarImage, AvatarFallback } from "~/components/ui/avatar";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import z from "zod";

const approveSchema = z.object({
  hourly_price: z.coerce.number().min(1, "Hourly rate required"),
  commission_percentage: z.coerce.number().min(0),
  delivery_rate: z.coerce.number().min(0),
  deposit_amount: z.coerce.number().min(0),
});

const rejectSchema = z.object({
  reason: z.string(),
});

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveCar,
  generateHostAgreement,
  getCarById,
  notifyApproval,
} from "~/api/cars";
import { useNavigate, useParams } from "react-router";
import { Loader } from "~/components/shared/Loader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { StatefulButton } from "~/components/ui/stateful-button";

const tabTriggerClass =
  "bg-transparent border-0 border-b-2 border-b-gray-200 " +
  "data-[state=active]:border-primary " +
  "data-[state=active]:bg-primary/10 " +
  "data-[state=active]:shadow-none " +
  "p-4 rounded-none";

const DOCUMENTS = [
  {
    key: "rc_book",
    title: "RC Book",
    desc: "Vehicle registration certificate",
    icon: FileText,
  },
  {
    key: "owner_aadhaar",
    title: "Owner Aadhaar",
    desc: "Identity verification document",
    icon: IdCard,
  },
  {
    key: "sign",
    title: "Owner Signature",
    desc: "Signed consent document",
    icon: PenTool,
  },
];

export default function CarDetail() {
  const { id } = useParams();

  const navigate = useNavigate();

  useEffect(() => {
    if (!id) navigate("/");
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["car", id],
    queryFn: () => getCarById(id),
    enabled: !!id,
  });

  const [decision, setDecision] = useState<"approve" | "reject" | "">(
    "approve",
  );

  const approveForm = useForm({
    resolver: zodResolver(approveSchema),
    defaultValues: {
      hourly_price: 0,
      commission_percentage: 0,
      delivery_rate: 0,
      deposit_amount: 0,
    },
  });

  const rejectForm = useForm({
    resolver: zodResolver(rejectSchema),
    defaultValues: {
      reason: "",
    },
  });

  const queryClient = useQueryClient();

  const { mutate: approve, status } = useMutation({
    mutationFn: approveCar,

    async onSuccess() {
      if (!data) return;

      const pdf = await generateHostAgreement({
        host_name: data.host.full_name,
        vehicle_number: data.car.registration_number,
        host_sign:
          data.documents.find((d) => d.document_type === "sign")
            ?.document_url ?? "",
      });

      await notifyApproval({
        carId: id,
        userId: data.host.id,
        email: {
          to: data.host.email,
          template: "vehicle-verified",
          data: {
            hostName: data.host.full_name,
            vehicleName: `${data.brand.name} ${data.model.name}`,
            registrationNumber: data.car.registration_number,
            approvalDate: new Date().toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            }),
            pdfUrl: pdf.pdf_url,
            companyName: "VeloRent",
          },
        },
      });

      queryClient.invalidateQueries({
        queryKey: ["pending"],
      });

      navigate("/pending");
    },
  });

  function onApproveSubmit(data) {
    approve({
      carId: id,
      ...data,
    });
  }

  function onRejectSubmit() {}

  if (isLoading) return <Loader />;

  const getDoc = (type: string) =>
    data?.documents?.find((d) => d.document_type === type);

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-12">
      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 mb-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {data?.model.name} - {data?.brand.name}
          </h1>

          <Badge variant="secondary">Not Approved</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-10 ">
        <div>
          <div className="relative aspect-video rounded-xl overflow-hidden bg-muted">
            <Carousel>
              <CarouselContent>
                {data?.images.map((i) => {
                  return (
                    <CarouselItem key={i.image_url}>
                      <img
                        src={i.image_url}
                        alt="Car"
                        className="w-full h-full object-cover"
                      />
                    </CarouselItem>
                  );
                })}
              </CarouselContent>
              <CarouselPrevious className="left-4 -mt-6 top-1/2 -translate-y-1/2" />
              <CarouselNext className="right-4 -mt-6 top-1/2 -translate-y-1/2" />
            </Carousel>
          </div>

          <Tabs
            defaultValue="basics"
            className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-8"
          >
            <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 bg-transparent w-full">
              <TabsTrigger value="basics" className={tabTriggerClass}>
                Basics
              </TabsTrigger>

              <TabsTrigger value="features" className={tabTriggerClass}>
                Features
              </TabsTrigger>

              <TabsTrigger value="documents" className={tabTriggerClass}>
                Documents
              </TabsTrigger>

              <TabsTrigger value="host" className={tabTriggerClass}>
                Host
              </TabsTrigger>

              <TabsTrigger value="locations" className={tabTriggerClass}>
                Locations
              </TabsTrigger>

              <TabsTrigger value="agreement" className={tabTriggerClass}>
                Agreement
              </TabsTrigger>
            </TabsList>
            <TabsContent value="basics" className="mt-6">
              <Card>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                    <div className="divide-y divide-muted [&>*:last-child]:border-0">
                      <Detail label="Brand" value={data?.brand.name} />
                      <Detail label="Model" value={data?.model.name} />
                      <Detail
                        label="Manufacturing Year"
                        value={data?.car.manufacturing_year ?? "—"}
                      />
                      <Detail
                        label="Registration Number"
                        value={data?.car.registration_number}
                      />
                      <Detail
                        label="Body Type"
                        value={capitalize(data?.car.body_type || "")}
                      />
                      <Detail
                        label="Seat Capacity"
                        value={`${data?.car.vehicle_seat_capacity} Seater`}
                      />
                      <Detail
                        label="Owner"
                        value={capitalize(data?.car.owner || "")}
                      />
                    </div>

                    <div className="divide-y divide-muted [&>*:last-child]:border-0">
                      <Detail
                        label="Fuel Type"
                        value={capitalize(data?.car.fuel_type || "")}
                      />
                      <Detail
                        label="Hourly Price"
                        value={`₹${data?.car.hourly_price ?? 0}/hr`}
                      />
                      <Detail
                        label="Deposit Amount"
                        value={`₹${data?.car.deposit_amount ?? 0}`}
                      />
                      <Detail
                        label="Commission"
                        value={`${data?.car.commission_percentage ?? 0}%`}
                      />
                      <Detail
                        label="RC Valid Till"
                        value={data?.car.rc_valid_till}
                      />
                      <Detail
                        label="Insurance Valid Till"
                        value={data?.car.insurance_valid_till}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="features" className="mt-6">
              <div className="flex flex-wrap gap-3">
                {data?.features.map((f) => (
                  <div
                    key={f.feature.id}
                    className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-foreground"
                  >
                    <CheckCircle2 size={14} className="text-primary shrink-0" />
                    <span>{f.feature.name}</span>
                  </div>
                ))}
              </div>
            </TabsContent>
            <TabsContent value="documents" className="mt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {DOCUMENTS.map((doc) => {
                  const Icon = doc.icon;
                  const document = getDoc(doc.key);

                  return (
                    <Card key={doc.key} className="relative overflow-hidden">
                      <CardContent className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 text-primary p-2 rounded-full">
                            <Icon className="h-5 w-5" />
                          </div>

                          <div>
                            <h4 className="text-sm font-semibold">
                              {doc.title}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              {doc.desc}
                            </p>
                          </div>
                        </div>

                        {document ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button size="sm">View</Button>
                            </DialogTrigger>

                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>{doc.title}</DialogTitle>
                              </DialogHeader>

                              <div className="flex items-center justify-center h-full bg-black">
                                <img
                                  src={document.document_url}
                                  alt={doc.title}
                                  className="max-w-full max-h-full object-contain"
                                />
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Badge variant="secondary">Required</Badge>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="host" className="mt-6">
              <Card className="relative overflow-hidden">
                <CardContent>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14">
                        <AvatarImage src={data?.host.avatar_url} alt="Host" />
                        <AvatarFallback>RS</AvatarFallback>
                      </Avatar>

                      <div className="space-y-1">
                        <h3 className="text-base font-semibold">
                          {data?.host.full_name}
                        </h3>

                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 text-sm">
                          <p className="flex items-center gap-1">
                            <Phone className="h-4 w-4 text-primary" />+
                            {data?.host.phone}
                          </p>

                          <p className="flex items-center gap-1">
                            <Mail className="h-4 w-4 text-primary" />
                            {data?.host.email}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="locations" className="mt-6">
              <Card className="relative overflow-hidden">
                <CardContent>
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-start gap-4">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold">
                          Pickup Location
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {data?.address.address_line1},{data?.address.city}
                          -&nbsp;
                          {data?.address.pincode}
                        </p>
                      </div>
                    </div>

                    <Button asChild className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${data?.address?.latitude},${data?.address?.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Open in Maps
                        <ArrowUpRight className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="agreement" className="mt-6">
              <Card>
                <CardContent className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive shrink-0">
                    <AlertCircle className="h-6 w-6" />
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-destructive">
                      Vehicle Not Approved
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      This car has not been approved yet. The agreement will be
                      available once the verification process is completed.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-xl font-semibold tracking-tight">
              Your Trip
            </CardTitle>
            <CardDescription>
              Select your travel dates and times below
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-1">Admin Decision</p>
              <Select
                value={decision}
                onValueChange={(value) =>
                  setDecision(value as "approve" | "reject" | "")
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="approve">Approve</SelectItem>
                    <SelectItem value="reject">Reject</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            {decision === "approve" && (
              <Form {...approveForm}>
                <form
                  onSubmit={approveForm.handleSubmit(onApproveSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={approveForm.control}
                    name="hourly_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hourly Rate</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter hourly rate" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={approveForm.control}
                    name="commission_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comission Rate</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter commision rate"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={approveForm.control}
                    name="delivery_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Rate</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter delivery deposit"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={approveForm.control}
                    name="deposit_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Security Deposit</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter security deposit"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <StatefulButton
                    status={status}
                    type="submit"
                    className="w-full"
                  >
                    Approve
                  </StatefulButton>
                </form>
              </Form>
            )}

            {decision === "reject" && (
              <Form {...rejectForm}>
                <form
                  onSubmit={rejectForm.handleSubmit(onRejectSubmit)}
                  className="space-y-4"
                >
                  <FormField
                    control={rejectForm.control}
                    name="reason"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rejection Reason</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter reason for rejection"
                            rows={4}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    variant="destructive"
                    className="w-full"
                  >
                    Reject
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function capitalize(text: string | undefined) {
  if (!text) return "";
  return text.charAt(0).toUpperCase() + text.slice(1);
}

type DetailProps = {
  label: string;
  value?: React.ReactNode;
};

export function Detail({ label, value }: DetailProps) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value ?? "—"}</span>
    </div>
  );
}
