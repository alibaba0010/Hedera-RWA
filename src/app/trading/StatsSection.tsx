import { Card, CardContent } from "@/components/ui/card";

export function StatsSection() {
  const stats = [
    {
      label: "Total Value Locked",
      value: "$24.5M",
      change: "+12.3%",
    },
    {
      label: "Properties Listed",
      value: "156",
      change: "+8.7%",
    },
    {
      label: "Active Investors",
      value: "2,847",
      change: "+15.2%",
    },
    {
      label: "Average Yield",
      value: "8.4%",
      change: "+0.3%",
    },
  ];

  return (
    <section className="py-16 bg-muted/50">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <div className="text-2xl lg:text-3xl font-bold text-primary mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-muted-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-xs text-green-600 font-medium">
                  {stat.change}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
