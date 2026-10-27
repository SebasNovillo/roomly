import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { portfolioDetails } from "../../../tests/fixtures/space-details";
import { bookingFixtureDay, bookingFixtureId, bookingFixtureSelection } from "../../../tests/fixtures/bookings";
const mocks = vi.hoisted(()=>({getViewer:vi.fn(),getSpace:vi.fn(),getBookingDay:vi.fn(),getReservation:vi.fn(),getMyBookings:vi.fn(),redirect:vi.fn(),notFound:vi.fn(),createClient:vi.fn()}));
vi.mock("@/features/auth/viewer",()=>({getViewer:mocks.getViewer}));
vi.mock("@/features/spaces/queries",()=>({getSpace:mocks.getSpace}));
vi.mock("@/features/bookings/queries",()=>({getBookingDay:mocks.getBookingDay,getReservation:mocks.getReservation,getMyBookings:mocks.getMyBookings}));
vi.mock("@/lib/supabase/server",()=>({createClient:mocks.createClient}));
vi.mock("next/navigation",()=>({redirect:mocks.redirect,notFound:mocks.notFound}));
vi.mock("@/features/bookings/components/review-view",()=>({ReviewView:()=>null}));
vi.mock("@/features/bookings/components/confirmation-view",()=>({ConfirmationView:()=>null}));
vi.mock("@/features/bookings/components/bookings-view",()=>({BookingsView:()=>null}));
import ReviewPage from "@/app/dashboard/spaces/[slug]/review/page";
import ConfirmationPage from "@/app/dashboard/reservations/[id]/page";
import MyBookingsPage from "@/app/dashboard/bookings/page";
const reviewArgs = () => ({params:Promise.resolve({slug:"atlas-meeting-room"}),searchParams:Promise.resolve({...bookingFixtureSelection,request:bookingFixtureId,q:"Atlas",amenity:"display"})});
beforeEach(()=>{
  vi.resetAllMocks(); mocks.getViewer.mockResolvedValue({name:"Member"}); mocks.getSpace.mockResolvedValue({ok:true,space:portfolioDetails[0]});
  mocks.getBookingDay.mockResolvedValue(bookingFixtureDay); mocks.getReservation.mockResolvedValue({ok:true,reservation:null});
  mocks.redirect.mockImplementation(()=>{throw new Error("REDIRECT");}); mocks.notFound.mockImplementation(()=>{throw new Error("NOT_FOUND");});
});
describe("protected booking pages with mocked session and database reads",()=>{
  it("renders a review with exact selection/filter back navigation",async()=>{
    const view = await ReviewPage(reviewArgs());
    expect(view.props.selection).toEqual(bookingFixtureSelection);
    expect(view.props.issue).toBeNull();
    expect(view.props.changeHref).toContain("q=Atlas&amenity=display&date=2027-01-05&start=09%3A00&end=10%3A00");
  });
  it("recovers a matching committed request after a lost confirmation response",async()=>{
    mocks.getReservation.mockResolvedValue({ok:true,reservation:{id:bookingFixtureId,space_id:portfolioDetails[0].id,starts_at:"2027-01-05T15:00:00Z",ends_at:"2027-01-05T16:00:00Z",status:"confirmed"}});
    await expect(ReviewPage(reviewArgs())).rejects.toThrow("REDIRECT");
    expect(mocks.getReservation).toHaveBeenCalledWith(bookingFixtureId,true);
    expect(mocks.redirect).toHaveBeenCalledWith(`/dashboard/reservations/${bookingFixtureId}`);
  });
  it("does not recover a mismatched or cancelled attempt as success",async()=>{
    mocks.getReservation.mockResolvedValue({ok:true,reservation:{id:bookingFixtureId,space_id:portfolioDetails[0].id,starts_at:"2027-01-05T15:00:00Z",ends_at:"2027-01-05T16:00:00Z",status:"cancelled"}});
    await ReviewPage(reviewArgs()); expect(mocks.redirect).not.toHaveBeenCalled();
  });
  it("returns not found for an absent or other-owner reservation before fetching space details",async()=>{
    await expect(ConfirmationPage({params:Promise.resolve({id:bookingFixtureId})})).rejects.toThrow("NOT_FOUND");
    expect(mocks.createClient).not.toHaveBeenCalled(); expect(mocks.getSpace).not.toHaveBeenCalled();
  });
  it("never renders a successful confirmation after a database read failure",async()=>{
    mocks.getReservation.mockResolvedValue({ok:false});
    const view = await ConfirmationPage({params:Promise.resolve({id:bookingFixtureId})});
    const html = renderToStaticMarkup(view);
    expect(html).toContain("We couldn’t load this booking");
    expect(html).not.toContain("Your booking is confirmed");
  });
  it("keeps authentication required on review and confirmation",async()=>{
    mocks.getViewer.mockRejectedValue(new Error("AUTH_REDIRECT"));
    await expect(ReviewPage(reviewArgs())).rejects.toThrow("AUTH_REDIRECT");
    await expect(ConfirmationPage({params:Promise.resolve({id:bookingFixtureId})})).rejects.toThrow("AUTH_REDIRECT");
    expect(mocks.getReservation).not.toHaveBeenCalled(); expect(mocks.getSpace).not.toHaveBeenCalled();
  });
  it("only shows a cancellation banner for an owner-readable cancelled record",async()=>{
    mocks.getMyBookings.mockResolvedValue({ok:false,kind:"setup"});
    const args=()=>({searchParams:Promise.resolve({tab:"cancelled",cancelled:bookingFixtureId})});
    let view=await MyBookingsPage(args());expect(view.props.successReference).toBeUndefined();
    mocks.getReservation.mockResolvedValue({ok:true,reservation:{id:bookingFixtureId,status:"confirmed"}});
    view=await MyBookingsPage(args());expect(view.props.successReference).toBeUndefined();
    mocks.getReservation.mockResolvedValue({ok:true,reservation:{id:bookingFixtureId,status:"cancelled"}});
    view=await MyBookingsPage(args());expect(view.props.successReference).toBe(bookingFixtureId);
    expect(mocks.getMyBookings).toHaveBeenCalledWith("cancelled",1);
  });
});
