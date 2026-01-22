import { TabsContent } from "@radix-ui/react-tabs";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { PendingCarsList } from "~/features/cars/pending-cars";

export default function Cars() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <h1 className="text-3xl font-bold tracking-tight">Available Cars</h1>
      <Tabs defaultValue="all" className="mt-6">
        <TabsList className="grid grid-cols-6 bg-transparent">
          <TabsTrigger
            value="all"
            className="bg-transparent border-0 border-b-2 border-b-gray-200 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-none p-4"
          >
            All
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="bg-transparent border-0 border-b-2 border-b-gray-200 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-none p-4"
          >
            Approved
          </TabsTrigger>
          <TabsTrigger
            value="pending"
            className="bg-transparent border-0 border-b-2 border-b-gray-200 data-[state=active]:border-primary data-[state=active]:bg-primary/10 data-[state=active]:shadow-none p-4"
          >
            Pending
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          <PendingCarsList />
        </TabsContent>
      </Tabs>
    </div>
  );
}
