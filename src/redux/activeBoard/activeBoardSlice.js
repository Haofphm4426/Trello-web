import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { API_ROOT } from 'utilities/constants';
import authorizedAxiosInstance from 'utilities/customAxios';
import { mapOrder } from 'utilities/sorts';

//Khởi tạo giá trị một Slice trong redux
const initialState = {
    currentFullBoard: null,
};

// Các hành động gọi api (bất đồng bộ) và cập nhật dữ liệu vào Redux, dùng createAsyncThunk đi kèm với extraReducers
// https://redux-toolkit.js.org/api/createAsyncThunk

export const fetchFullBoardDetailsAPI = createAsyncThunk('activeBoard/fetchFullBoardDetailsAPI', async (boardId) => {
    const request = await authorizedAxiosInstance.get(`${API_ROOT}/v1/boards/${boardId}`);
    return request.data;
});

// Khởi tạo một slice trong redux store
export const activeBoardSlice = createSlice({
    name: 'activeBoard',
    initialState,
    reducers: {
        // Lưu ý luôn là ở đây cần cặp ngoặc nhọn cho function trong reducer cho dù code bên trong chỉ có 1 dòng, đây là rule của Redux
        // https://redux-toolkit.js.org/usage/immer-reducers#mutating-and-returning-state
        updateCurrentFullBoard: (state, action) => {
            const fullBoard = action.payload;
            state.currentFullBoard = fullBoard;
        },
        updateCardInBoard: (state, action) => {
            const incomingCard = action.payload;
            const column = state.currentFullBoard.columns.find((i) => i._id === incomingCard.columnId);
            if (column) {
                const card = column.cards.find((i) => i._id === incomingCard._id);
                if (card) {
                    const updateKey = ['title', 'cover', 'description', 'memberIds', 'comments'];
                    updateKey.forEach((key) => {
                        card[key] = incomingCard[key];
                    });
                }
            }
        },
    },
    extraReducers: (builder) => {
        builder.addCase(fetchFullBoardDetailsAPI.fulfilled, (state, action) => {
            let fullBoard = action.payload; // chính là cái request.data phía trên

            fullBoard.users = fullBoard.owners.concat(fullBoard.members);
            fullBoard.totalUsers = fullBoard.users?.length;

            fullBoard.columns = mapOrder(fullBoard.columns, fullBoard.columnOrder, '_id');
            fullBoard.columns.forEach((column) => {
                column.cards = mapOrder(column.cards, column.cardOrder, '_id');
                column.cards.forEach((card) => {
                    let c_cardMembers = [];
                    if (Array.isArray(card.memberIds)) {
                        card.memberIds.forEach((memberId) => {
                            const fullMemberInfo = fullBoard.users.find((u) => u._id === memberId);

                            if (fullMemberInfo) {
                                c_cardMembers.push(fullMemberInfo);
                            }
                        });
                    }

                    card['c_cardMembers'] = c_cardMembers;
                });
            });

            state.currentFullBoard = fullBoard;
        });
    },
});

// Action creators are generated for each case reducer function
// Actions: dành cho các components bên dưới gọi bằng dispatch() tới nó để cập nhật lại dữ liệu thông qua reducer (chạy đồng bộ)
// Để ý ở trên thì không thấy properties actions đâu cả, bởi vì những cái actions này đơn giản là được thằng redux tạo tự động theo tên của reducer nhé.
export const { updateCurrentFullBoard, updateCardInBoard } = activeBoardSlice.actions;

// Selectors: mục đích là dành cho các components bên dưới gọi bằng useSelector() tới nó để lấy dữ liệu từ trong redux store ra sử dụng
export const selectCurrentFullBoard = (state) => {
    return state.activeBoard.currentFullBoard;
};

// Export default cái activeBoardReducer của chúng ta
export const activeBoardReducer = activeBoardSlice.reducer;
